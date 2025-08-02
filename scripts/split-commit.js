const { execSync } = require('child_process');
const fs = require('fs');
// Use built-in fetch and FormData available in Node.js >=18
// to avoid external dependencies like axios or form-data.

function logBlock(title, content, logger = console.log) {
  logger('---');
  logger(title);
  if (content !== undefined) logger(content);
}

(async () => {
  const apiKeyPath = process.env.OPENAI_API_KEY_FILE || 'openai.key';
  const apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();
  const baseBranch = process.env.BASE_BRANCH || 'main';
  const diff = execSync(`git diff origin/${baseBranch}...HEAD`, { encoding: 'utf8' });
  const prDescription = process.env.PR_DESCRIPTION || '';

  logBlock('Original diff from base branch to HEAD:', diff);
  const diffFile = 'diff.txt';
  fs.writeFileSync(diffFile, diff);

  const uploadForm = new FormData();
  uploadForm.append('purpose', 'assistants');
  const fileBuffer = fs.readFileSync(diffFile);
  uploadForm.append('file', new Blob([fileBuffer], { type: 'text/plain' }), diffFile);
  let uploadJson;
  try {
    const uploadRes = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: uploadForm
    });
    uploadJson = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadJson.error?.message || uploadRes.statusText);
    }
  } catch (err) {
    console.error('Failed to upload diff file:', err.message);
    process.exit(1);
  }
  if (!uploadJson.id) {
    console.error('Failed to upload diff file:', uploadJson);
    process.exit(1);
  }
  const fileId = uploadJson.id;

  const prompt = `PR Description:\n${prDescription}\n\nThe full diff is provided in the attached file. Split the diff into multiple small commits. Return JSON object {"commits": [{"message": string, "patch": string}]}.\nEach patch must be a valid unified diff starting with "diff --git" and ending with a newline.\nPatches must apply sequentially starting from the base branch and, when combined in order, must exactly reproduce the diff in the attached file. Double-check that your patches together match the file.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: prompt }
        ],
        attachments: [{ file_id: fileId }]
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'commit_splits',
          schema: {
            type: 'object',
            properties: {
              commits: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    patch: { type: 'string', pattern: '^diff --git ' }
                  },
                  required: ['message', 'patch'],
                  additionalProperties: false
                }
              }
            },
            required: ['commits'],
            additionalProperties: false
          },
          strict: true
        }
      }
    })
  });
  fs.unlinkSync(diffFile);
  const responseText = await response.text();
  logBlock('Full OpenAI API response:', responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (err) {
    console.error('Failed to parse OpenAI API response as JSON:', responseText);
    process.exit(1);
  }

  function extractContent(payload) {
    if (typeof payload?.output_text === 'string') {
      return payload.output_text;
    }
    const message = Array.isArray(payload?.output) ? payload.output[0] : null;
    if (!message || !Array.isArray(message.content)) return '';
    const textPart = message.content.find(part => part.type === 'output_text');
    return textPart?.text || '';
  }

  const content = extractContent(data);
  if (!content) {
    console.error('No textual content found in OpenAI response');
    process.exit(1);
  }
  logBlock('GPT response:', content);

  let commits;
  try {
    const parsed = JSON.parse(content);
    commits = Array.isArray(parsed.commits) ? parsed.commits : [];
  } catch (err) {
    console.error('Failed to parse GPT response as JSON:', content);
    process.exit(1);
  }

  logBlock(`Parsed ${commits.length} commits from GPT response`);

  execSync(`git reset --hard origin/${baseBranch}`);

  commits.forEach((commit, index) => {
    logBlock(`Commit ${index + 1}: ${commit.message}`, `Patch:\n${commit.patch}`);
    const patchFile = `patch_${index}.diff`;
    const patchContent = commit.patch.endsWith('\n') ? commit.patch : `${commit.patch}\n`;
    fs.writeFileSync(patchFile, patchContent);
    try {
      execSync(`git apply --check ${patchFile}`);
    } catch (err) {
      console.error(`Patch validation failed for ${patchFile}:`, patchContent);
      throw err;
    }
    execSync(`git apply ${patchFile}`);
    execSync('git add -A');
    execSync(`git commit -m ${JSON.stringify(commit.message)}`);
    fs.unlinkSync(patchFile);
  });

  const finalDiff = execSync(`git diff origin/${baseBranch}...HEAD`, { encoding: 'utf8' });
  logBlock('Final diff after applying patches:', finalDiff);
  if (finalDiff.trim() !== diff.trim()) {
    logBlock('Combined patches do not match the original diff', undefined, console.error);
    const origFile = 'original.diff';
    const finalFile = 'final.diff';
    fs.writeFileSync(origFile, diff);
    fs.writeFileSync(finalFile, finalDiff);
    try {
      const comparison = execSync(`diff -u ${origFile} ${finalFile}`, { encoding: 'utf8' });
      logBlock('Difference between original and final diff:', comparison, console.error);
    } catch (err) {
      const output = err.stdout || err.stderr || '';
      logBlock('Difference between original and final diff:', output, console.error);
    } finally {
      fs.unlinkSync(origFile);
      fs.unlinkSync(finalFile);
    }
    process.exit(1);
  }
})();
