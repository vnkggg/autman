//[create_at: 2026-03-02 17:05:07]
//[title: 随机视频图集]
//[class: 影音类]
//[author: 2990775834]
//[disable:false]
//[admin: false]
//[open_source: false]
//[icon: https://bbs.autman.cn/assets/files/2023-12-12/1702408610-992864-favicon.ico]
//[rule: ^dy]
//[rule: ^视频菜单$]
//[rule: ^图集菜单$]
//[rule: ^数据统计$]
//[rule: ^随机短视频$]
//[priority: 99999999999999999999999999999999999999999]
//[platform: qq,qb,wx,tb,tg,web,wxmp]
//[version: 1.0.5]
//[price: 0.5]
//[cron: */30 * * * *]
//[description: 随机指令：dy视频/dy图集。也可以指定发送某人的视频或图集。菜单指令为：dy视频菜单（视频指令缺省用法：dy菜单）/dy图集菜单。根据菜单可以发送指定名字的视频，指令为：dy视频芊芊（缺省用法：dy芊芊）/dy图集倩倩。设置推送群指令：set otto suiji_push_groups qqgroup:123,wxgroup:456,tggroup:-100123]
//[service: 官方权威认证 QQ：297129582]

const axios = require('axios');
const middleware = require('./middleware.js');
const senderID = middleware.getSenderID();
const sender = new middleware.Sender(senderID);

const apiUrl1 = "http://dy.jx.cangg.cn/api/random_link?";
const apiUrl2 = "http://dy1.jx.cangg.cn/api/random_link?";
const caidan = "http://dy.jx.cangg.cn/api/statistics?list_type=";

function parseCommand(cmd) {
    console.log("[指令解析] 原始指令内容: " + cmd);
    if (cmd === "视频菜单" || cmd === "dy视频菜单" || cmd === "dy菜单") {
        console.log("[指令解析] 识别为视频菜单指令");
        return { type: "menu", mediaType: "video" };
    }
    if (cmd === "图集菜单" || cmd === "dy图集菜单") {
        console.log("[指令解析] 识别为图集菜单指令");
        return { type: "menu", mediaType: "album" };
    }
    if (cmd === "数据统计") {
        console.log("[指令解析] 识别为统计指令");
        return { type: "statistics" };
    }
    if (cmd === "随机短视频" || cmd === "dy帮助") {
        console.log("[指令解析] 识别为帮助指令");
        return { type: "help" };
    }
    const pattern = /^dy(?:\s+)?(视频|图集)?(?:\s+)?([\u4e00-\u9fa5a-zA-Z0-9]+)?$/;
    const match = cmd.match(pattern);
    if (match) {
        return {
            type: "media",
            media: match[1] || "视频",
            name: match[2] || null
        };
    }
    console.log("[指令解析] 无法识别的指令类型");
    return { type: "unknown" };
}

async function fetchApiBody(url) {
    const apiUrls = [apiUrl1, apiUrl2];
    for (const apiUrl of apiUrls) {
        try {
            const res = await axios.get(`${apiUrl}${url}`, {
                timeout: 8000,
                maxRedirects: 5,
                headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 12; SM-G9880) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36 EdgA/106.0.0.0" }
            });
            if (res && res.data) {
                return res.data;
            }
        } catch (e) {
            console.log(`接口 ${apiUrl} 请求失败: ${e.message}`);
        }
    }
    console.log("两个地址都请求失败");
    return;
}

async function getRedirectVideoUrl(url) {
    const res = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 10,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const realUrl = res.request.res.responseUrl;
    const link = String(realUrl || "").trim();
    if (!link || link.indexOf("http") !== 0) {
        throw new Error("视频可能被删除");
    }
    return link;
}

async function short_links(url) {
    const short_url = await middleware.get("dsptj_dwz");
    if (!short_url) return url;
    const body = await middleware.request({
        url: `${short_url}${url}`,
        method: "get",
        timeout: 5000
    });
    return body || url;
}

async function send_photo(videoLink, imType) {
    console.log("↓↓↓发送图集↓↓↓");
    const imgs = videoLink.slice();
    let limit = await middleware.get("sendCosImgTotleLimit");
    if (!limit) {
        limit = imgs.length;
    }
    imgs.length = Math.min(Number(limit) || imgs.length, imgs.length);
    let onceLimit = await middleware.get("sendCosImgOnceLimit");
    if (!onceLimit) {
        onceLimit = 9;
    }
    let onceSleep = await middleware.get("sendCosImgOnceSleep");
    if (!onceSleep) {
        onceSleep = 1000;
    }
    let msg = "";
    for (let i = 1, len = imgs.length; i <= len; i++) {
        let imgUrl = imgs[i - 1];
        if (imType === "clawbot" || imType === "wx" || imType === "wc") {
            imgUrl = await short_links(encodeURIComponent(imgUrl));
        }
        msg += "[CQ:image,file=" + imgUrl + "]";
        if (i % onceLimit === 0) {
            await sender.reply(msg);
            msg = "";
            await middleware.sleep(onceSleep);
        }
    }
    if (msg.length > 0) {
        await sender.reply(msg);
    }
    console.log(imgs);
    console.log("↑↑↑图集发送完成↑↑↑");
}

async function handleMediaCommand(command) {
    const query = [];
    query.push("media=" + encodeURIComponent(command.media));
    if (command.name) {
        query.push("name=" + encodeURIComponent(command.name));
    }
    const queryString = query.join("&");
    const res = await fetchApiBody(queryString);
    if (!res || !res.link) {
        throw new Error("未找到指定作者内容\n发送「" + command.media + "菜单」获取名单");
    }
    const isAlbum = command.media === "图集";
    if (isAlbum) {
        await send_photo(res.link, await sender.getImtype());
    } else {
        let videoUrl = res.link;
        const finalUrl = await getRedirectVideoUrl(videoUrl);
        videoUrl = finalUrl;
        console.log("↓↓↓发送视频↓↓↓");
        console.log(videoUrl);
        await sender.replyVideo(videoUrl);
        console.log("↑↑↑视频发送完成↑↑↑");
    }
}

async function sendPage(lines, currentPage, totalPages, mediaType) {
    const start = (currentPage - 1) * 10;
    const end = start + 10;
    const pageContent = lines.slice(start, Math.min(end, lines.length)).join('\n');
    const menuType = mediaType === 'album' ? '图集' : '视频';
    let message = '-----' + menuType + '菜单-----\n' + pageContent;
    const example = menuType === "视频" ? '(例：dy暖央)' : '(例：dy图集香香)';
    if (currentPage === 1) {
        message += '\n\n' + example;
        message += totalPages === 1 ? '\n共' + totalPages + '页' : '\n共' + totalPages + '页      「下一页」';
    } else if (currentPage < totalPages) {
        message += '\n\n' + example;
        message += '\n第' + currentPage + '/' + totalPages + '页      「下一页」';
    } else {
        message += '\n\n' + example;
        message += '\n第' + currentPage + '/' + totalPages + '页   已到最后一页';
    }
    await sender.reply(message);
}

async function waitForNextPageCommand(paginationData) {
    if (!paginationData || paginationData.currentPage >= paginationData.totalPages) {
        return;
    }
    console.log('[分页监听] 等待用户输入，超时时间：10000ms');
    const T = await sender.input(10000);
    console.log('[分页监听] 用户输入：', T);
    if (T === "下一页") {
        paginationData.currentPage++;
        await sendPage(paginationData.lines, paginationData.currentPage, paginationData.totalPages, paginationData.mediaType);
        if (paginationData.currentPage < paginationData.totalPages) {
            await waitForNextPageCommand(paginationData);
        }
    }
}

async function showMenu(mediaType) {
    console.log('[菜单处理] 开始处理' + (mediaType === 'album' ? '图集' : '视频') + '菜单请求');
    try {
        const type = mediaType === "album" ? "album" : "video";
        const statUrl = caidan + type;
        console.log('[菜单处理] 调用菜单API: ' + statUrl);
        const statRes = await axios.get(statUrl, {
            timeout: 8000,
            maxRedirects: 5,
            headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 12; SM-G9880) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36 EdgA/106.0.0.0" }
        });
        const statData = statRes && statRes.data ? statRes.data : null;
        console.log('[菜单处理] API响应状态: ' + (statData ? "成功" : "失败"));
        if (statData && statData.user_types) {
            const lines = statData.user_types.split('\n');
            const totalPages = Math.ceil(lines.length / 10);
            const paginationData = {
                lines: lines,
                currentPage: 1,
                totalPages: totalPages,
                mediaType: mediaType
            };
            await sendPage(lines, 1, totalPages, mediaType);
            if (totalPages > 1) {
                await waitForNextPageCommand(paginationData);
            }
            console.log('[菜单处理] 已发送第1页，共' + totalPages + '页，等待用户输入...');
        } else {
            console.error('[菜单处理] API返回数据格式异常:', statRes);
            await sender.reply("获取菜单失败，数据格式异常");
        }
    } catch (error) {
        console.error("[菜单处理] 异常错误信息:", error.message, "堆栈:", error.stack);
        await sender.reply("获取菜单时发生异常：" + error.message);
    }
    console.log('[菜单处理] ' + (mediaType === 'album' ? '图集' : '视频') + '菜单处理完成');
}

async function showStatistics() {
    const res = await axios.get(caidan, {
        timeout: 8000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 12; SM-G9880) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36 EdgA/106.0.0.0" }
    });
    const tongji = res && res.data ? res.data : null;
    if (!tongji) {
        await sender.reply("获取统计数据失败");
        return;
    }
    await sender.reply(`----数据统计----\n视频：${tongji.视频.statistics.videos}\n图集：${tongji.图集.statistics.images}\n历史调用：${tongji.random_api_usage.total_calls}\n今日调用：${tongji.random_api_usage.daily_calls}`);
}

async function showHelp() {
    const helpText = [
        "📺 随机视频图集使用说明 📸",
        "----------------------",
        "1. 随机视频：dy视频",
        "2. 随机图集：dy图集",
        "3. 指定视频：dy视频+作者名",
        "   (简写：dy作者名)",
        "4. 指定图集：dy图集作者名",
        "5. 视频名单：视频菜单",
        "6. 图集名单：图集菜单",
        "7. 统计信息：数据统计",
        "----------------------",
        "示例：",
        "dy暖央 → 发送暖央的视频",
        "dy图集荼荼 → 发送荼荼的图集"
    ].join("\n");
    await sender.reply(helpText);
}

async function cronPush() {
    const pushGroups = await middleware.get("suiji_push_groups");
    if (!pushGroups) return;
    console.log(pushGroups);
    const pgs = String(pushGroups).split(",");
    const data = await axios.get(apiUrl1, {
        timeout: 8000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 12; SM-G9880) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36 EdgA/106.0.0.0" }
    });
    const resData = data && data.data ? data.data : null;
    if (!resData || !resData.link) {
        console.log("cron 获取随机视频失败");
        return;
    }
    const link = await getRedirectVideoUrl(resData.link);
    for (let i = 0; i < pgs.length; i++) {
        const imType = pgs[i].slice(0, 2);
        const groupCode = pgs[i].slice(8);
        console.log(`cron push imType=${imType} groupCode=${groupCode}`);
        await middleware.push(imType, groupCode, "", "随机短视频", link);
    }
}

async function main() {
    try {
        const msg = (await sender.getMessage() || "").trim();
        const imType = await sender.getImtype();
        if (!msg) {
            await cronPush();
            return;
        }
        const command = parseCommand(msg);
        console.log(`[主流程] 解析结果: 类型=${command.type}, 参数=${JSON.stringify(command)}`);
        switch (command.type) {
            case "media":
                await handleMediaCommand(command);
                break;
            case "menu":
                await showMenu(command.mediaType);
                break;
            case "statistics":
                await showStatistics();
                break;
            case "help":
                await showHelp();
                break;
            case "unknown":
            default:
                await sender.reply("未知指令，发送「帮助」查看使用说明");
                break;
        }
        console.log("[主流程] === 指令处理完成 ===");
    } catch (error) {
        console.error("[主流程] 全局异常捕获:", error.message, "堆栈:", error.stack);
        await sender.reply("处理名单出错：" + error.message);
    }
}

main().catch(e => {
    console.log("随机视频图集全局异常：", e);
    sender.reply(`插件运行异常：${e.message}`).catch(console.log);
});
