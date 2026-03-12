import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const rootDir = process.cwd();

type FeishuServiceLike = {
    sendFile: (chatId: string, filePath: string, fileName?: string) => Promise<{ success: boolean; error?: string }>;
} | null | undefined;

/**
 * Creates the generate_pptx FunctionTool.
 * @param feishuService - Optional Feishu service to auto-upload the file after generation.
 * @param getChatId - Getter returning the current Feishu chat_id to upload to.
 */
export function createGeneratePptxTool(
    feishuService?: FeishuServiceLike,
    getChatId?: () => string
) {
    return new FunctionTool({
        name: 'generate_pptx',
        description: 'CRITICAL: Use this tool to physically create a .pptx file. You MUST call this tool if you want to output a presentation; do not just describe the slides. This tool also automatically uploads the file to the Feishu chat.',
        parameters: z.object({
            filename: z.string().describe('The name of the file to save, e.g. output/presentation.pptx'),
            title: z.string().describe('The title of the presentation'),
            theme: z.enum([
                'modern', 'dark', 'corporate', 'elegant',
                'tech', 'minimalist', 'nature', 'vibrant',
                'cute', 'retro', 'gradient', 'neon'
            ]).optional().describe('The visual theme: modern(现代), dark(暗黑), corporate(商务), elegant(优雅), tech(科技), minimalist(极简), nature(自然), vibrant(活力), cute(可爱), retro(复古), gradient(渐变), neon(霓虹)'),
            slides: z.array(z.object({
                title: z.string().describe('The title text for this slide'),
                content: z.string().describe('The main content/bullets for this slide')
            })).describe('Array of slides to generate')
        }),
        execute: async ({ filename, title, theme, slides }) => {
            console.log(`[PPTX] 🚀 Tool invoked for file: ${filename}`);
            try {
                const absolutePath = path.resolve(rootDir, filename);
                if (!absolutePath.startsWith(rootDir)) {
                    return { status: 'error', message: 'Cannot write files outside the project root.' };
                }

                // Ensure directory exists
                await fs.mkdir(path.dirname(absolutePath), { recursive: true });

                const PPTXGenJS = require('pptxgenjs');
                const pptxgen = PPTXGenJS.default || PPTXGenJS;
                let pres = new pptxgen();
                pres.layout = 'LAYOUT_16x9';
                pres.title = title;

                const selectedTheme = theme || 'modern';
                let titleBg = '283A5E'; let titleColor = 'FFFFFF';
                let masterBg = 'FFFFFF'; let masterTitleColor = '1E2761'; let masterContentColor = '363636';

                if (selectedTheme === 'dark') {
                    titleBg = '111111'; titleColor = 'EEEEEE'; masterBg = '1A1A1A'; masterTitleColor = 'FFFFFF'; masterContentColor = 'CCCCCC';
                } else if (selectedTheme === 'corporate') {
                    titleBg = '003366'; titleColor = 'FFFFFF'; masterBg = 'F5F5F7'; masterTitleColor = '003366'; masterContentColor = '333333';
                } else if (selectedTheme === 'elegant') {
                    titleBg = '4A4E69'; titleColor = 'F2E9E4'; masterBg = 'F2E9E4'; masterTitleColor = '22223B'; masterContentColor = '4A4E69';
                } else if (selectedTheme === 'tech') {
                    titleBg = '0B192C'; titleColor = '00FFCB'; masterBg = '0F2C59'; masterTitleColor = '00FFCB'; masterContentColor = 'E2F6CA';
                } else if (selectedTheme === 'minimalist') {
                    titleBg = 'FFFFFF'; titleColor = '111111'; masterBg = 'FAFAFA'; masterTitleColor = '222222'; masterContentColor = '555555';
                } else if (selectedTheme === 'nature') {
                    titleBg = 'E8F3D6'; titleColor = '285430'; masterBg = 'FCFDF2'; masterTitleColor = '5F8D4E'; masterContentColor = '3A4F41';
                } else if (selectedTheme === 'vibrant') {
                    titleBg = 'FF5722'; titleColor = 'FFFFFF'; masterBg = 'FFF8E1'; masterTitleColor = 'FF5722'; masterContentColor = '333333';
                } else if (selectedTheme === 'cute') {
                    titleBg = 'FFD1D1'; titleColor = 'FF9494'; masterBg = 'FFF5E4'; masterTitleColor = 'FF9494'; masterContentColor = '8B7E74';
                } else if (selectedTheme === 'retro') {
                    titleBg = '8B5E34'; titleColor = 'FFEEDB'; masterBg = 'F4EBD0'; masterTitleColor = '8B5E34'; masterContentColor = '5C4033';
                } else if (selectedTheme === 'gradient') {
                    titleBg = '8A2BE2'; titleColor = 'FFFFFF'; masterBg = 'F8F8FF'; masterTitleColor = '8A2BE2'; masterContentColor = '191970';
                } else if (selectedTheme === 'neon') {
                    titleBg = '000000'; titleColor = 'FF00FF'; masterBg = '111111'; masterTitleColor = '00FFFF'; masterContentColor = 'E0E0E0';
                }

                pres.defineSlideMaster({
                    title: 'TITLE_SLIDE',
                    background: { color: titleBg },
                    objects: [
                        { placeholder: { options: { name: 'title', type: 'title', x: 1, y: 2, w: 8, h: 1.5, fontSize: 48, bold: true, align: 'center', color: titleColor } } }
                    ]
                });

                pres.defineSlideMaster({
                    title: 'MASTER_SLIDE',
                    background: { color: masterBg },
                    objects: [
                        { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.4, w: 9, h: 1, fontSize: 32, bold: true, color: masterTitleColor } } },
                        { placeholder: { options: { name: 'body', type: 'body', x: 0.5, y: 1.6, w: 9, h: 3.5, fontSize: 22, color: masterContentColor, breakLine: true } } }
                    ]
                });

                // Title slide
                let titleSlide = pres.addSlide({ masterName: 'TITLE_SLIDE' });
                titleSlide.addText(title, { placeholder: 'title' });

                // Content slides
                for (const s of slides) {
                    let slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
                    slide.addText(s.title, { placeholder: 'title' });
                    slide.addText(s.content, { placeholder: 'body' });
                }

                await pres.writeFile({ fileName: absolutePath });

                // Auto-upload to Feishu if service and chatId are available
                const chatId = getChatId?.();
                console.log(`[PPTX] Upload check: feishuService=${!!feishuService}, chatId=${chatId || '(empty)'}, absolutePath=${absolutePath}`);
                if (feishuService && chatId) {
                    console.log(`[PPTX] Attempting Feishu file upload to chat ${chatId}...`);
                    const uploadResult = await feishuService.sendFile(chatId, absolutePath, path.basename(absolutePath));
                    console.log(`[PPTX] Upload result:`, JSON.stringify(uploadResult));
                    if (uploadResult.success) {
                        return { status: 'success', message: `SUCCESS: PPTX file created and physically SENT to the Feishu chat as an attachment. Inform the user they can see the file card in the chat. Do not provide [sandbox:/mnt/data/...] links.` };
                    } else {
                        console.warn('[PPTX] Feishu upload failed:', uploadResult.error);
                        return { status: 'success', message: `PPTX created at ${filename}, but Feishu upload failed: ${uploadResult.error}. Help the user download it locally if needed.` };
                    }
                } else {
                    console.warn(`[PPTX] Skipping Feishu upload: feishuService=${!!feishuService}, chatId=${chatId || '(empty)'}`);
                }

                return { status: 'success', message: `Successfully generated PPTX at ${filename}` };

            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                return { status: 'error', message: `Failed to generate PPTX: ${msg}` };
            }
        }
    });
}

// Default export without Feishu integration (for backward compatibility / skill loader)
export const generate_pptx_tool = createGeneratePptxTool();
