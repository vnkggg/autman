//[create_at: 2025-02-07 16:49:23]
//[version: 1.3.0]
//[price: 0.00]
//[open_source:true]
//[title:扭一扭]
//[icon:https://bbs.autman.cn/assets/files/2025-02-07/1738918121-687468-d4e2bcad5afe4c74a5e76f635f50b1a3.png]
//[rule:^扭一扭$]
//[author:hdbjlizhe]
//[service:282617666]
//[admin: true]
//[description:扭一扭，羽化面板错误修复！
//[param: {"required":false,"key":"otto.niuyiniu_url","placeholder":"","name":"接口url","desc":""}]

const axios = require('axios');
const middleware = require('./middleware.js');
const senderID = middleware.getSenderID();
const sender = new middleware.Sender(senderID);

const CONFIG = {
    BUCKET_PREFIX: 'otto',
    DEFAULT_API: "http://api.yujn.cn/api/ksxjjsp.php",
    PARAM_KEY: "otto.niuyiniu_url", // 和原脚本参数key完全一致，带otto前缀
    TIMEOUT: 5000
};

class StorageManager {
    async getGlobal(key) {
        return await middleware.get(key);
    }
}

// 复刻原版dataType:"location"行为：跟随重定向，获取最终视频地址
async function getRedirectVideoUrl(api) {
    const res = await axios.get(api, {
        timeout: CONFIG.TIMEOUT,
        maxRedirects: 10, // 跟随跳转，模拟框架location解析
        validateStatus: () => true // 允许301/302重定向状态码
    });
    // 取最终跳转后的真实地址
    const realUrl = res.request.res.responseUrl;
    const link = String(realUrl).trim();
    if (!link || !link.startsWith('http')) {
        throw new Error("接口未返回有效视频跳转链接");
    }
    return link;
}

async function main() {
    let waitMsg = null;
    try {
        const storage = new StorageManager();
        // 读取自定义接口，和原脚本逻辑一致：有配置用配置，无则默认
        let customUrl = await storage.getGlobal(CONFIG.PARAM_KEY);
        let targetApi = customUrl || CONFIG.DEFAULT_API;

        waitMsg = await sender.reply("请稍候...");
        // 获取跳转后的真实视频链接（修复之前只读接口文本的bug）
        const videoLink = await getRedirectVideoUrl(targetApi);
        console.log("获取到视频直链：", videoLink);
        // 发送视频
        await sender.replyVideo(videoLink);
    } catch (err) {
        console.error("扭一扭执行失败：", err.message);
        await sender.reply(`获取短视频失败：${err.message}`);
    } finally {
        // 无论成败强制撤回等待消息，解决卡在请稍候
        if (waitMsg) {
            try {
                await sender.recallMessage(waitMsg);
            } catch (e) {
                console.log("撤回提示消息异常：", e.message);
            }
        }
    }
}

main().catch(e => {
    console.log("扭一扭全局异常：", e);
    sender.reply(`插件运行异常：${e.message}`).catch(console.log);
});
