const { execSync } = require('child_process');
const fs = require('fs');

(async () => {
  const apiKeyPath = process.env.OPENAI_API_KEY_FILE || 'openai.key';
  const apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();
  const baseBranch = process.env.BASE_BRANCH || 'main';
  const diff = execSync(`git diff origin/${baseBranch}...HEAD`, { encoding: 'utf8' });
  const prDescription = process.env.PR_DESCRIPTION || '';

  console.log('Original diff from base branch to HEAD:', diff);

  const prompt = `PR Description:\n${prDescription}\n\nDiff:\n${diff}\n\nSplit the diff into multiple small commits. Return JSON object {"commits": [{"message": string, "patch": string}]}.\nEach patch must be a valid unified diff starting with "diff --git" and ending with a newline.\nPatches must apply sequentially starting from the base branch and, when combined in order, must exactly reproduce the original diff.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
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
  const responseText = await response.text();
  console.log('Full OpenAI API response:', responseText);

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
  console.log('GPT response:', content);

  let commits;
  try {
    const parsed = JSON.parse(content);
    commits = Array.isArray(parsed.commits) ? parsed.commits : [];
  } catch (err) {
    console.error('Failed to parse GPT response as JSON:', content);
    process.exit(1);
  }

  console.log(`Parsed ${commits.length} commits from GPT response`);

  execSync(`git reset --hard origin/${baseBranch}`);

  commits.forEach((commit, index) => {
    console.log(`Commit ${index + 1}: ${commit.message}`);
    console.log(`Patch:\n${commit.patch}`);
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
  console.log('Final diff after applying patches:', finalDiff);
  if (finalDiff.trim() !== diff.trim()) {
    console.error('Combined patches do not match the original diff');
    process.exit(1);
  }
})();
