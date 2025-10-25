//const fetch = require('node-fetch'); // 如果你用的是 Node.js < 18，请先安装：npm install node-fetch
const fs = require('fs');
const path = require('path');

// 配置参数
const url = 'http://localhost:8080/api/sites';
const jwtToken = ''; // 替换为你的实际 JWT Token

// 要上传的文件路径（请确保该文件存在）
const fileName = process.argv[2] || 'site-0000000000000.tar.gz';
const filePath = path.resolve(__dirname, fileName); // 可根据实际情况修改路径
const fileBaseName = path.basename(filePath);

const fileBuffer = fs.readFileSync(filePath);

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  console.error(`❌ 文件不存在: ${filePath}`);
  process.exit(1);
}

const fileBlob = new Blob([fileBuffer]);

// 创建 FormData 对象并附加字段
const formData = new FormData();
formData.append('uuid', '00000000-0000-0000-0000-000000000000'); // 文本字段
formData.append('site', fileBlob, fileBaseName);

console.log(formData);


// 发送请求
fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
  },
  body: formData
})
  .then(async (res) => {
    const text = await res.text(); // 或者 res.json()，取决于后端返回格式
    console.log(`✅ 状态码: ${res.status}`);
    console.log('📨 响应:', text);
  })
  .catch((err) => {
    console.error('❌ 请求失败:', err);
  });

