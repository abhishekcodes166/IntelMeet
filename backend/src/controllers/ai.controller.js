import OpenAI from "openai";

let client;

const getClient = () => {
    if (!client) {
        client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
    }
    return client;
};

const generateSummary = async (req, res) => {

    try {

        const { transcript } = req.body;

        if (!transcript) {

            return res.status(400).json({
                success: false,
                message: "Transcript is required",
            });

        }

        const completion =
            await getClient().chat.completions.create({

                model: "deepseek/deepseek-v4-flash",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an AI meeting assistant. Summarize meetings clearly in bullet points.",
                    },
                    {
                        role: "user",
                        content: transcript,
                    },
                ],

                temperature: 0.7,
                max_tokens: 500,

            });

        const summary =
            completion.choices[0].message.content;

        return res.status(200).json({
            success: true,
            summary,
        });

    } catch (error) {

        console.log(
            "OPENROUTER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to generate summary",
        });

    }

};

export { generateSummary };