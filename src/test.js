const { remote, $ } = require('webdriverio');
const { v4: uuidv4 } = require('uuid');
const { uploadFileToS3, deleteLocalFile } = require('./s3');
const { getWebDriverConfig } = require('./webdriverConfig');
const { getNextStep, CHAT_HISTORY } = require('./gpt');
const { isXPathValid, generateRobustXPath } = require('./utils');

async function createSession() {

    try {
        return await remote(getWebDriverConfig());
    } catch (err) {
        console.error('Error creating session:', err);
        await driver.deleteSession();
        process.exit(1);
    }
}

async function getScreenshot(driver) {

    const id = uuidv4();
    const filePath = `./screenshoots/${id}.png`;

    try {
        await driver.saveScreenshot(filePath);
    } catch (err) {
        console.error('Error taking screenshoot:', err);
        await driver.deleteSession();
        process.exit(1);
    }

    try {
        return await uploadFileToS3(filePath);
    } catch (err) {
        console.error('Error uploading screenshoot:', err);
        await driver.deleteSession();
        process.exit(1);
    } finally {
        await deleteLocalFile(filePath);
    }
}

async function getSource(driver) {

    try {
        var source = driver.getPageSource();
        return source;
    } catch (err) {
        console.error('Error taking source:', err);
        await driver.deleteSession();
        process.exit(1);
    }
}

async function stepExecutor2(driver, step) {

    if (step.action == "click") {

        const element = await driver.$(step?.element?.locator);
        await element.click();

    } else if (step.action == "write_text") {

        if (step?.element?.locator_type == "xpath") {

            const element = await driver.$(step?.element?.locator);
            await element.setValue(step.parameter);

        } else if (step?.element?.locator_type == "id") {

            const element = await driver.$("#" + step?.element?.locator);
            await element.setValue(step.parameter);
        }

    } else if (step.action == "drag_and_drop") {

        const element1 = await driver.$(step?.element1?.locator);
        const element2 = await driver.$(step?.element2?.locator);
        await element1.dragAndDrop(element2);

    } else if (step.action == "swipe_down") {

        // await swipePageDown(driver);

    } else if (step.action == "stop") {

        console.log(step.parameter);
        await driver.deleteSession();
        process.exit(0);
    } else {

        console.error('Error: Invalid step action:', step.action);
        await driver.deleteSession();
        process.exit(1);
    }
}

function shortenSource(source) {

    var pattern = /(package\s*=\s*"[^"]*"\s*)|(\n)/g;

    var newString = source.replace(pattern, '');

    return newString;
}

async function generateTest() {

    const driver = await createSession();

    let step = {}

    do {
        try {

            await driver.pause(5000);

            const s3URL = await getScreenshot(driver);
            let source = await getSource(driver);
            source = shortenSource(source)
            step = await getNextStep(s3URL, source);

            if (await isXPathValid(source, step?.element?.locator)) {

                console.log("xpath is valid");
                await stepExecutor2(driver, step);

            } else {

                console.log("xpath is not valid");
                let locator = await generateRobustXPath(xml);
                stepExecutor2(driver, { ...step, element: { ...step.element, locator } });
                CHAT_HISTORY.push({ "role": "assistant", "content": { ...step, element: { ...step.element, locator } } });
            }

        } catch (err) {
            console.error('Error executing step2:', err);
        }

    } while (step.action != "stop");
}

exports.generateTest = generateTest;