const libxmljs = require("libxmljs");

async function isXPathValid(xmlString, xpathExpression) {
    try {
        const xmlDoc = await libxmljs.parseXmlAsync(xmlString);
        const result = xmlDoc.find(xpathExpression);
        return result.length > 0;
    } catch (error) {
        console.error("Error in parsing or applying XPath:", error.message);
        return false;
    }
}

exports.isXPathValid = isXPathValid;

async function generateRobustXPath(xmlString) {
    const xmlDoc = await libxmljs.parseXmlAsync(xmlString); // Use parseXml
    const rootElement = xmlDoc.get('/*'); // Gets the root element
    const attributes = rootElement.attrs();
    let xpath = `//${rootElement.name()}`;
    let conditions = [];

    for (let i = 0; i < attributes.length; i++) {
        conditions.push(`@${attributes[i].name()}='${attributes[i].value()}'`);
    }

    if (conditions.length > 0) {
        xpath += `[${conditions.join(' and ')}]`;
    }

    return xpath;
}

exports.generateRobustXPath = generateRobustXPath;

