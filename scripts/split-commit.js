const { execSync } = require('child_process');
const fs = require('fs');

(async () => {
  const apiKeyPath = process.env.OPENAI_API_KEY_FILE || 'openai.key';
  const apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();
  const diff = execSync('git diff origin/main...HEAD', { encoding: 'utf8' });
  const prDescription = process.env.PR_DESCRIPTION || '';

  const prompt = `PR Description:\n${prDescription}\n\nDiff:\n${diff}\n\nSplit the diff into multiple small commits. Return JSON array where each item has {"message": string, "patch": string}. Patches must apply sequentially starting from the base branch.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt
    })
  });
  const data = await response.json();
  const content = data.output?.[0]?.content?.[0]?.text || '';

  let commits;
  try {
    commits = JSON.parse(content);
  } catch (err) {
    console.error('Failed to parse GPT response:', content);
    process.exit(1);
  }

  execSync('git reset --hard origin/main');

  commits.forEach((commit, index) => {
    const patchFile = `patch_${index}.diff`;
    fs.writeFileSync(patchFile, commit.patch);
    execSync(`git apply ${patchFile}`);
    execSync('git add -A');
    execSync(`git commit -m ${JSON.stringify(commit.message)}`);
    fs.unlinkSync(patchFile);
  });
})();
