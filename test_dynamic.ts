import { getSkillTools, loadSkillsPrompt } from './src/agent/skillsManager.js';

async function main() {
    const tools = await getSkillTools();
    console.log(`Loaded ${tools.length} dynamic tools`);
    for (const tool of tools) {
        console.log(` - ${tool.name}`);
    }
}
main();
