//not used
async function stepExecutor(driver, step) {

    try {
        if (step.action == "click") {

            const source = await getSource(driver);

            const locator = await getElementLocator(step.element, source);

            const element = await driver.$(locator.locator);

            await element.click();
        } else if (step.action == "write_text") {

            const source = await getSource(driver);

            const locator = await getElementLocator(step.element, source);

            const element = await driver.$(locator.locator);

            await element.setValue(step.parameter);

        } else if (step.action == "drag_and_drop") {

            const source = await getSource(driver);

            const locator1 = await getElementLocator(step.element1, source);
            const element1 = await driver.$(locator1.locator);

            const locator2 = await getElementLocator(step.element2, source);
            const element2 = await driver.$(locator2.locator);

            await element1.dragAndDrop(element2);

        } else if (step.action == "stop") {
            console.log(step.parameter);
            await driver.deleteSession();
            process.exit(0);
        } else {

            console.error('Error: Invalid step action:', step.action);
            await driver.deleteSession();
            process.exit(1);
        }
    } catch (err) {

        console.error('Error executing step:', err);
        await driver.deleteSession();
        process.exit(1);
    }
}



