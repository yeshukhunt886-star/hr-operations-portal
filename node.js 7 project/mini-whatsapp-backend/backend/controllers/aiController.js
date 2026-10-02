import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const chatWithAI = async (
    req,
    res
) => {
    try {
        const {
            message,
            conversation = [],
        } = req.body;

        if (
            !message ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Message is required",
            });
        }

        const messages = [
            {
                role: "system",
                content:
                    "You are a helpful AI assistant inside a WhatsApp-like chat application. Give clear, friendly, and concise answers.",
            },

            ...conversation.map(
                (item) => ({
                    role:
                        item.role ===
                        "assistant"
                            ? "assistant"
                            : "user",

                    content:
                        item.content,
                })
            ),

            {
                role: "user",
                content:
                    message.trim(),
            },
        ];

        const completion =
            await openai.chat.completions.create(
                {
                    model: "gpt-4o-mini",
                    messages,
                }
            );

        const reply =
            completion
                .choices?.[0]
                ?.message?.content ||
            "Sorry, I could not generate a response.";

        return res.status(200).json({
            success: true,
            reply,
        });

    } catch (error) {
        console.error(
            "AI CHAT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "AI assistant failed",
        });
    }
};