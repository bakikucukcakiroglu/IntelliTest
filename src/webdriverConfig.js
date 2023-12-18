
function getWebDriverConfig() {
    const capabilities = {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': 'Android',
        // 'appium:appPackage': 'com.android.settings',
        // 'appium:appActivity': '.Settings',
    };

    return {
        hostname: process.env.APPIUM_HOST || 'localhost',
        port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
        logLevel: 'info',
        capabilities,
    };
}

exports.getWebDriverConfig = getWebDriverConfig;
