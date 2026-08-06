//[create_at: 2025-02-07 16:49:23]
//[version: 1.0.0]
//[price: 0.00]
//[open_source:true]
//[title:扭一扭]
//[icon:https://bbs.autman.cn/assets/files/2025-02-07/1738918121-687468-d4e2bcad5afe4c74a5e76f635f50b1a3.png]
//[rule:^扭一扭$]
//[author:hdbjlizhe]
//[service:282617666]
//[admin: true]
//[description:扭一扭，可自定义接口url]
//[param: {"required":false,"key":"otto.niuyiniu_url","placeholder":"","name":"接口url","desc":""}]
//var url = "https://www.nihaowua.com/v/video.php"
let url = get("niuyiniu_url") ? get("niuyiniu_url") : "http://api.yujn.cn/api/ksxjjsp.php"
//发送“请稍候”提示词
id = sendText("请稍候...")
//请求视频
var red = request({
    url: url,
    dataType: "location",
})
//调试日志
Debug(red)
//发送视频
sendVideo(red)
//撤回“请稍候”提示词
RecallMessage(id)
