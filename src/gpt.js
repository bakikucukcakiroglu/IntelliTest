const OpenAI = require("openai");

const openai = new OpenAI();

const SYSTEM_PROMPT = () => {
    return `You are a visual AI assistant. I will provide you a UI image and a final intent. I will also provide you the source of the UI image in XML format. You should use this XML to find the locators of the elements.
            Your role is to analyze the UI image and provide the next step in the UI flow based on this image and the final intent. I will execute the step you provide and send you the new UI image. This process will continue until you decide "intent is reached" or "intent is unreachable."
            You should only return a step in JSON format at each dialog. Do not return anything else other than a step JSON. 
            A step is a JSON and consists of fields depending on the group of action:
                - Group1 actions: "action", "element", "parameter".
                - Group2 actions: "action", "element1", "element2", "parameter". For Group2 actions, "element1" is the current element, and "element2" is the target element (for example, "element1" is dragged to "element2" in a "drag_and_drop" action).
                - Group3 actions: "action". This is either stop or swipe_down. Use swipe_down if you want to scroll down the page.
            The "parameter" is the text you want to write if the action is "write_text".
            The "element" is the element you want to interact with. It is a JSON with fields "locator_type", "locator", and "elementXML". For example, {"locator_type": "xpath", "locator": "//android.widget.Button[@text='Login']", "elementXML": { "XML": "<android.widget.Button
                class="android.widget.Button"
                text="Login"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content" />"
                "index": 2 
            }.
            If elementXML is repeated in the source, you should give the information of which element you want to interact with. For example, if there are 3 buttons with the same XML, you should give the index of the button you want to interact with. For example, if you want to interact with the second button, you should give "elementXML" : { "index": 2, "XML": "<android.widget.Button" ... />" }. If element is unique, index is 1. 
            If you consider the intent is reached or unreachable, you should return "stop" as the action and "intent reached" or "intent unreachable" as the parameter.
            The final intent for this UI interaction is ${process.argv[2]}.
            Final answer should be like {"action": "click", "element": {"locator_type": "xpath", "locator": "//android.widget.Spinner[android.widget.TextView[@text='Lütfen seçiniz' and @resource-id='android:id/text1']]", "elementXML": { "index": index of element, "XML": xml of element }}} or {"action": "write_text", "element": {"locator_type": "xpath", "locator": "//android.widget.EditText[@text='Username']", "elementXML": xml of element}, "parameter": "John"} or {"action": "drag_and_drop", "element1": {"locator_type": "xpath", "locator": "//android.widget.Button", "elementXML": xml of element}, "element2": {"locator_type": "xpath", "locator": "//android.widget, "elementXML": xml of element}}
            Important Note: Determine the element you want to interact with by using the XML source. You should only give XPATH locators. Do not give invalid XPATHs that do not corresponds to any element.  If you do you will be penalized."`;
};

const CHAT_HISTORY = [];
exports.CHAT_HISTORY = CHAT_HISTORY;

CHAT_HISTORY.push({ "role": "system", "content": SYSTEM_PROMPT() });
CHAT_HISTORY.push({ "role": "system", "content": "All messages after this message are the old steps advised by the AI assistant. They are provided to you to not repeating the same actions. However, the last message is from user and asking for a new step. If user indicated that the last advised step was not correct, you should retry to give a step JSON." });

async function getNextStep(image_url, source, isRetry = false) {
    try {
        if (!isRetry) {

            CHAT_HISTORY.push({
                role: "user",
                content: [
                    { type: "text", text: `Give me the step JSON. XML: ${source}` },
                    { type: "image_url", image_url },
                ],
            });
        } else {

            let lastSystemMessage = CHAT_HISTORY[CHAT_HISTORY.length - 1];

            CHAT_HISTORY.push({
                role: "user",
                content: [
                    { type: "text", text: `${JSON.stringify(lastSystemMessage)} was not correct. Please retry to give a different step JSON. XML: ${source}` },
                    { type: "image_url", image_url },
                ],
            });
        }

        console.log("CHAT_HISTORY", JSON.stringify(CHAT_HISTORY));
        console.log("CHAT_HISTORY_END")

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: CHAT_HISTORY,
            max_tokens: 4096,
            temperature: 0
        });

        CHAT_HISTORY.pop();
        CHAT_HISTORY.push(response.choices[0].message);
        const step = parseGptVisionApiResponse(response.choices[0].message.content);
        return step;

    } catch (err) {

        if (err.status === 429) {

            const resetTime = err.headers['x-ratelimit-reset-tokens'];
            console.log(`Rate limit exceeded. Waiting for ${resetTime} seconds before retrying...`);

            let timeToWait = parseTimeString(resetTime);
            await new Promise(resolve => setTimeout(resolve, timeToWait));
            return getNextStep(image_url, source);

        } else {

            console.error('Error calling GPT Vision:', err);
            throw err;
        }
    }
}
exports.getNextStep = getNextStep;

async function getElementLocator(description, source) {

    try {

        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [{ "role": "system", "content": "You are an AI assistant that takes XML of a mobile UI and a verbal element description. You need to give xpath locator to described element, do not make up elements only consider the elements in the given source. Locator will be used in appium so give an appropriate format. Your answer must be in JSON format with fields 'locator_type' and 'locator'.  Do not return anything else other than a step JSON. " },
            {
                role: "user",
                content: [
                    { type: "text", text: `Element description: ${description} ` },
                    { type: "text", text: `XML: ${source} ` },
                ],
            }],
            max_tokens: 4096,
            temperature: 0
        });

        console.log("GPT-Text advised raw:", response.choices[0].message.content);

        const locator = parseGptTextApiResponse(response.choices[0].message.content);
        console.log("GPT-Text advised:", locator);
        return locator;

    } catch (err) {
        console.error('Error calling GPT Text:', err);
        throw err;
    }
}
exports.getElementLocator = getElementLocator;

function parseGptVisionApiResponse(content) {

    // Remove the Markdown code block syntax
    console.log("content", content);
    const jsonStr = content.replace(/```json\n|\n```/g, '').trim();

    console.log("jsonStr", jsonStr);

    // Parse the JSON string
    try {
        const jsonData = JSON.parse(jsonStr);
        console.log("GPT-Vision advised:", jsonData);
        return jsonData;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}

function parseGptTextApiResponse(content) {
    // Remove the Markdown code block syntax

    console.log("content", content);
    const jsonStr = content.replace(/```json\n|\n```/g, '').trim();

    console.log("jsonStr", jsonStr);

    // Parse the JSON string
    try {
        const jsonData = JSON.parse(jsonStr);
        return jsonData;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}


function parseTimeString(timeString) {
    const regex = /(\d+(\.\d+)?)([hms])/g;
    let totalMilliseconds = 0;
    let match;

    while ((match = regex.exec(timeString)) !== null) {
        const value = parseFloat(match[1]);
        const unit = match[3];

        switch (unit) {
            case 'h': // hours
                totalMilliseconds += value * 3600000 + 5000;
                break;
            case 'm': // minutes
                totalMilliseconds += value * 60000 + 5000;
                break;
            case 's': // seconds
                totalMilliseconds += value * 1000 + 5000;
                break;
        }
    }

    return totalMilliseconds;
}


