// ==UserScript==
// @name        柠檬音乐转种插件
// @namespace   Violentmonkey Scripts
// @match       https://dicmusic.com/torrents.php?id=*
// @match       https://lemonhd.club/*
// @match       https://redacted.sh/torrents.php?id=*
// @grant       none
// @version     1.1
// @author      Posase
// @author      Posase
// @description 2024/12/23 21:39:27
// ==/UserScript==

var torrent = {};
var db, targetWindow, canSend, offsetY = 10;  // 初始偏移量;
const redLogUrl = "https://redacted.sh/torrents.php?action=loglist&torrentid="
const searchUrl = "https://lemonhd.club/music_torrents.php?search_type=files&search="

const dbName = "nmzz", tabName = "torrent_info"

function showMessage(text, fontColor = "#fff") {
    const messageDiv = document.createElement("div");
    messageDiv.textContent = text;
    messageDiv.style.position = "fixed";
    messageDiv.style.top = `${offsetY}px`;
    messageDiv.style.left = "10px";  // 可以根据需要调整左边距
    messageDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    messageDiv.style.color = fontColor ;
    messageDiv.style.padding = "10px";
    messageDiv.style.borderRadius = "5px";
    messageDiv.style.transition = "top 0.5s ease";

    document.body.appendChild(messageDiv);

    // 每显示一个提示框，就增加偏移量，避免重叠
    offsetY += 50;  // 根据提示框的高度调整偏移量

    // 自动消失
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);  // 3秒后消失

    // 提示框消失后调整位置
    setTimeout(() => {
        offsetY -= 50;  // 释放空位，准备下一个提示框
    }, 3000);
}

function openDB(version = 2) {
  const request = indexedDB.open(dbName, version);
  request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains(tabName)) {
      const objectStore = db.createObjectStore(tabName, { keyPath: 'torrent_id' });
      // objectStore.createIndex('name', 'name', { unique: false }); // 创建索引
      console.log('对象存储创建成功');
    } else {
      console.log('对象存储已经存在');
    }
  };

  request.onsuccess = function(event) {
    db = event.target.result;
    console.log('数据库打开成功', db);
    if(window.opener){
      window.opener.postMessage(true, "*");
    }
  };

  request.onerror = function(event) {
    console.log('打开数据库失败', event.target.error);
  };
}

function insert(db, storeName, data) {
  console.log(data)
  var request = db.transaction([tabName], 'readwrite')
    .objectStore(tabName)
    .put(data);
  request.onsuccess = function (event) {
    showMessage('数据获取成功: ' + data.torrent_id, 'yellow');
    console.log('数据写入成功');
  };
  request.onerror = function (event) {
    console.log('数据写入失败');
  }
}

function selectAll(db, tabName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(tabName, 'readonly'); // 创建只读事务
    const objectStore = transaction.objectStore(tabName);

    const result = [];
    const cursorRequest = objectStore.openCursor();
    cursorRequest.onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        resolve(result);
      }
    }
  });
}

function clearDb(db, storeName) {
  console.log(db)
  const transaction = db.transaction(storeName, 'readwrite'); // 'myStore' 是你要清空的对象存储名称
  const objectStore = transaction.objectStore(storeName);
  const clearRequest = objectStore.clear();

  clearRequest.onsuccess = function() {
    console.log("所有数据已删除");
  };

  clearRequest.onerror = function(event) {
    console.error("删除数据失败", event);
  };
}

function checkFinish() {
  if(canSend && torrent.file_num == 3) {
    torrent.file_num = 0;
    console.log(torrent)
    targetWindow.postMessage(torrent, "*");
  }
  console.log("当前已下载文件数: ", torrent.file_num);
}

function fetchFile(name, url) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("网络响应失败");
      return response.blob();
    })
    .then(data => {
      torrent[name] = data;
      torrent.file_num += 1;
      checkFinish();
    })
    .catch(error => {
      console.error("下载失败:", error);
      throw error;
    });
}



function fetchRedLog(torrent_id) {
  const url = redLogUrl + torrent_id
  console.log(url)
  fetch(url).then(rep => {
    console.log(rep.ok)
    return rep.text()
  }).then(htmlString => {
    console.log(htmlString)
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const textContent = doc.body.textContent || doc.body.innerText;
    const textList = textContent.split(/Score.*?\)/).filter(text => text.trim() != '')
    console.log(textList.map(text => text.length))
    console.log('日志长度', textList.length)
    torrent.log_num = textList.length;
    torrent.log_list = textList;
    torrent.file_num += 1;
    checkFinish()
  });
}

function fetchRedTorrent(btn) {
  // 获取种子id
  let str = btn.previousElementSibling.href
  const torrent_id = str.substring(str.lastIndexOf("=") + 1);
  console.log(torrent_id)
  // 下载文件
  torrent = {file_num: 0, torrent_id: torrent_id, from: location.hostname, href: location.href}
  fetchFile('json', 'https://redacted.sh/ajax.php?action=torrent&id=' + torrent_id)
  fetchFile('torrent', btn.parentElement.firstElementChild.href)

  // 获取日志
  let logBtn = btn.parentElement.parentElement.parentElement.nextElementSibling.querySelector("a:nth-child(2)")
  if(logBtn.textContent.includes("Log")){
    fetchRedLog(torrent_id)
  } else {
    torrent.log_list = []
    torrent.file_num += 1
    torrent.log_num = 0
    checkFinish()
  }
}

function createBtn() {
  let btn = document.createElement("a")
  btn.className = "tooltip button_pl"
  btn.textContent = "ZZ"
  btn.className = "nmzz"
  btn.addEventListener('click', function() {

    // 搜索该曲目
    let name = document.querySelector("#content > div > div.header > h2 > span").textContent
    targetWindow = window.open(searchUrl + name, '_blank');
    canSend = false;
    fetchRedTorrent(btn);
  });
  return btn;
}

function addRedactedListener() {
  console.log("add listener.")
  window.addEventListener('message', function(event) {
    const message = event.data;
    console.log('Received message:', message);
    canSend = true;
    checkFinish()
  });
}

function redacted() {
  addRedactedListener()
  let boxList = document.querySelectorAll(".torrent_action_buttons")
  boxList.forEach((box) => {
    box.appendChild(document.createTextNode(' | '))
    box.appendChild(createBtn())
  });
}

function addSListener() {
  console.log("start addSListener")
  window.addEventListener('message', function(event) {
    console.log(event.origin)
    if(event.origin != location.host) {
      const message = event.data;
      console.log(message)
      clearDb(db, tabName)
      insert(db, tabName, message)
    }
  });
}

function uploadFile(fileInput, fileList) {
  const dataTransfer = new DataTransfer();
  fileList.forEach(data => {
    const blob = new Blob([data.text], { type: 'text/plain' });
    const file = new File([blob], data.name, { type: "text/plain" });
    dataTransfer.items.add(file);
  });
  fileInput.files = dataTransfer.files;
  const event = new Event('change');
  fileInput.dispatchEvent(event);
}

function refreshTorrent(spec) {
  console.log("refresh")
  spec.textContent = ""
  selectAll(db, tabName)
    .then(list => {
      if(list.length == 0) {
        spec.textContent = "无种子数据"
      } else {
        result = list[0]
        spec.textContent = "Torrent: " + result.torrent_id + ' LogNum: ' + result.log_num + ' from ' + result.from
      }
    });
}

function fillTorrent(result) {
  let torrentInput = document.querySelector('input[name="torrent_file"]')
  let jsonInput = document.querySelector("#upload-form > table > tbody > tr:nth-child(3) > td.rowfollow > input[type=file]")
  let logInput = document.querySelector('input[name="log_files[]"]')
  let srcInput = document.querySelector('.src_link')

  let torrent_id = result.torrent_id;
  document.querySelector('input[name="uplver"]').checked = true
  document.querySelector('input[name="read_flag"]').checked = true
  uploadFile(jsonInput, [{name: torrent_id + '.json', text: result.json}])
  uploadFile(torrentInput, [{name: torrent_id + '.torrent', text: result.torrent}])
  uploadFile(logInput, result.log_list.map((log,inx) => {return {name: torrent_id + inx + '.log', text: log};}))
}

function checkTorrent(item) {
  let url = new URL(item.parentElement.parentElement.parentElement.querySelector('a[title="种子链接"]').href);
  let params = new URLSearchParams(url.search);
  let albumid = params.get('albumid');
  let torrentid = params.get('torrentid');
  console.log(albumid, torrentid)
  fetch("https://lemonhd.club/music_details.php?method=check", {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      "priority": "u=0, i",
      "sec-ch-ua": "\"Microsoft Edge\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1"
    },
    "referrer": "https://lemonhd.club/music_details.php?albumid=" + albumid,
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": "albumid=" + albumid + "&torrentid=" + torrentid + "&status=pass&reason=",
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  })
  .then(response => response.text()) // 如果重定向返回 HTML 页面，使用 text() 获取响应
  .then(data => {
    item.className = "check_status pass"
    showMessage('专辑: ' + albumid + '种子: ' + torrentid + ' 审核完成!', 'yellow')
  })
  .catch(error => console.error('Error:', error));
}

function lemonhd() {
  openDB()
  addSListener()

  // 添加转种功能
  let uploadForm = document.querySelector("#upload-form > table > tbody > tr:nth-child(2) > td.rowfollow")
  if(uploadForm){
    let refresh = document.createElement("input")
    let button = document.createElement("input")
    let spec = document.createElement("span")
    spec.className = "descr-txt"
    spec.id = 'zzdesc'
    refresh.type = "button"
    refresh.value = "刷新数据"
    button.type = "button"
    button.value = "填写数据"
    uploadForm.appendChild(refresh)
    uploadForm.appendChild(button)
    uploadForm.appendChild(spec)

    refresh.addEventListener('click', function() {
      refreshTorrent(spec)
    });
    button.addEventListener('click', function() {
      selectAll(db, tabName)
        .then(list => {
          if(list.length == 0) {
            spec.textContent = "获取数据失败"
          } else {
            let result = list[0]
            spec.textContent = "当前填写种子: " + result.torrent_id
            fillTorrent(result)
          }
        });
    });
  }

  // 添加一键审核功能
  if(location.href.startsWith("https://lemonhd.club/music_details.php?albumid=")) {
    console.log('可一键审核')
    let btn = document.createElement("a")
    btn.textContent = "一键审核"
    btn.addEventListener('click', () => {
      console.log('开始一键审核')
      let list = document.querySelectorAll('img.check_status.uncheck');
      list.forEach((item) => {
        checkTorrent(item);
      });
    });
    document.querySelector("div.nav-list").appendChild(btn)
  }
}

(function() {
  'use strict';

  const hostname = window.location.hostname;

  if (hostname === 'dicmusic.com') {
  } else if (hostname === 'lemonhd.club') {
    lemonhd();
  } else if(hostname === 'redacted.sh') {
    redacted()
  }

})();
