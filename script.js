"ui";
ui.layout(
    <vertical>
        <appbar layout_gravity="center">
          <toolbar layout_gravity="center" title="高速" bg="#333333"></toolbar>
        </appbar>
        <horizontal padding="10 10" gravity="center_vertical" w="*">
          <text layout_weight="1"  w="auto" text="无障碍权限" />
          <Switch id="barrierFreeSwitch" w="auto"/>
        </horizontal>
        <horizontal padding="10 10" gravity="center_vertical" w="*">
          <text layout_weight="1"  w="auto" text="打开悬浮窗" />
          <Switch id="floatySwitch" w="auto"/>
        </horizontal>
        <horizontal padding="10 10" gravity="center_vertical" w="*">
          <text layout_weight="1"  w="auto" text="打开日志" />
          <Switch id="logSwitch" w="auto"/>
        </horizontal>
        <horizontal padding="10 10" gravity="center_vertical" w="*">
          <text layout_weight="1"  w="auto" text="到点时自动开始购买" />
          <Switch id="autoBuy" w="auto"/>
        </horizontal>
        {/* <horizontal padding="10 10" gravity="center_vertical" w="*">
          <text layout_weight="1"  w="auto" text="打开机场悬浮窗" />
          <Switch id="airportFloatySwitch" w="auto"/>
        </horizontal> */}
        <horizontal padding="10 10" gravity="center_vertical" w="*">
          <text layout_weight="1"  w="auto" text="version: 0.46 (stable)" />
        </horizontal>
        {/* <horizontal padding="10 10">
          <text >提交间隔时间</text><input id="submitIntervalInput" gravity="center" margin="10 0" w="100"></input><text>秒</text>
        </horizontal> */}
        
    </vertical>
);

//
const threadsCollection = {
  loginThread: {
    thread: null,
    sub: {

    }
  }
}

let isAutoBuy = false

let autoBuyThread = null

const isDebug = false;

const tempLogFunc = console.log

console.log = function(msg) {
  let now = new Date()
  let hour = now.getHours()
  let minute = now.getMinutes()
  let second = now.getSeconds()
  hour = hour < 10 ? '0' + hour : hour
  minute = minute < 10 ? '0' + minute : minute
  second = second < 10 ? '0' + second : second
  let time = hour + ':' + minute + ':' + second
  tempLogFunc(time + '  ' + msg)
}
let floatyWidget = null;
let floatyThread = null;

//登录成功提示
const loginSuccessTips = '登录成功'

const loginBtnTexts = {
  enableLogin: '开始登录',
  disableLogin: '停止登录',
}

let isKeepAlive = false

let loginThread = null;
let buyThread = null;
let timerThread = null;
let keepAliveThread = null
let waitForLoginThread = null
let autoLoginThread = null
let closeAuthorizationThread = false//在非登录状态下去关闭授权窗口的进程

//登录相关的几个thread
let clickLoginThread = null;
let clickPersonLoginThread = null;
let clickAllowBtnThread = null;


let isNotify = true;

let loginExpireThread = null;

let isBuy = false;


// 提交间隔时间
let submitIntervalTime = 0//单位秒

const NOTIFY_ENABLE_TEXT = '提醒:开';
const NOTIFY_DISABLE_TEXT = '提醒:关';

let pages= [
 
  {
    title: '驿路黔寻',
    name: '首页'
  },
  {
    title: '商品分类',
    name: '分类'
  },
  {
    title: '个人中心',
    name: '我的'
  },
  {
    title: '购物车',
    name: '购物车'
  }
]


//标题栏位于深度23的位置
const depthTitle = 23
//根据pages的keywords返回当前是哪个页面
function getPage() {
  let isPageFind = false
  for(let i=0; i<pages.length; i++) {
    if(boundsInside(0, 0, device.width, 400).textMatches(pages[i].title).findOne(1)) {
      isPageFind = true
      return Object.assign({}, pages[i], {index: i})
    }
  }
  if(!isPageFind) {
    console.log('未找到页面')
    return false
  }
}

ui.autoBuy.on('click', (checked)=> {
  if(checked) {
    enableAutoBuy()
  }else {
    disableBuyThread()
  }
})

function enableAutoBuy() {
  if(autoBuyThread) return
  autoBuyThread = threads.start(autoBuyFunc)
}

function getServerTime() {
  var res = http.get('http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp')
  let body = res.body.json()
  let nowTimeStamp = parseInt(body.data.t)
  let nowTime = new Date(nowTimeStamp)
  return new Date(nowTime)
}

function autoBuyFunc() {
  const tarGetHour = 13;
  const tarGetMinute = 0;
  const targetSecond = Math.floor((Math.random() * 3) + 1);
  console.log('开启自动购买进程，请在'+ tarGetHour +'点'+ tarGetMinute + '分' + targetSecond +'秒之前进入商品详情页')
  textMatches('商品详情').waitFor()
  console.log('检测到商品详情页，开启自动购买')
  while(true) {
    let timeGap = 0
    var res = http.get('http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp')
    let body = res.body.json()
    let nowTimeStamp = parseInt(body.data.t)
    let nowTime = new Date(nowTimeStamp)
    console.log('服务器时间：' + nowTime.toISOString())
    nowTime.setHours(tarGetHour)
    nowTime.setMinutes(tarGetMinute)
    nowTime.setSeconds(targetSecond)
    nowTime.setMilliseconds(0)
    timeGap = nowTime.getTime() - nowTimeStamp
    if(timeGap < 0 && buyThread) {
      console.log('今天抢购已结束')
      if(autoBuyThread) {
        let thread = autoBuyThread
        autoBuyThread = null
        thread.interrupt()
      }
      return
    }
    if(timeGap < 200) {
      console.log('时间已到 冲')
      enableBuyThread()
      if(autoBuyThread) {
        let thread = autoBuyThread
        autoBuyThread = null
        thread.interrupt()
      }
      return
    }
    if(timeGap > 120000) {
      sleep(60000)
    }else if(timeGap > 10000) {
      sleep(5000)
    }else  {
      sleep(100)
    }
  }
}

function disableAutoBuy() {
  if(autoBuyThread) {
    let thread = autoBuyThread
    autoBuyThread = null
    thread.interrupt()
  }
}

//改变提醒状态
function toggleNotify() {
  isNotify = !isNotify
  if(isNotify) {
    floatyWidget.shake.setText(NOTIFY_ENABLE_TEXT)
  }else {
    floatyWidget.shake.setText(NOTIFY_DISABLE_TEXT)
  }
}
function enableNotify() {
  isNotify = true
  ui.run(()=> {
    floatyWidget.shake.setText(NOTIFY_ENABLE_TEXT)
  })
}
function disableNotify() {
  isNotify = false
  ui.run(()=> {
    floatyWidget.shake.setText(NOTIFY_ENABLE_TEXT)
  })
}

let keepAliveStatus = '我的'


function navigation(navText) {
  let navBtn = boundsInside(0, device.height - 600, device.width, device.height).textMatches(navText).findOne(1)
  return navBtn && navBtn.click()
}

//保活方法
function keepAlice() {
  if(isPass13TimePoint()) return
  let page = getPage()
  page && console.log('当前页面: ' + page.name)
  if(page) {
    if(page.name === '我的') {
      navigation('商城')
    }else {
      navigation('我的')
    }
    // let optionalPages = JSON.parse(JSON.stringify(pages))
    // optionalPages.splice(page, 1)
    // let btnName = optionalPages[Math.floor(Math.random()*optionalPages.length)].name
    
    // if(typeof btnName == 'string') {
    //   console.log('要去的页面:' + btnName);
    //   return myClick(btnName, true)
    // }else {
    //   console.log('非string对象' + btnName);
    // }
  }
}

//安全终结进程
function killThreadSafe() {
  const currentThread = threads.currentThread()
  function travelThroughout() {

  }
}

function killAllThread() {
  ui.run(()=> {
    //恢复按钮文字
    floatyWidget.loginBtn.setText('开始登录')
    floatyWidget.shake.setText(NOTIFY_ENABLE_TEXT)
    floatyWidget.keepAliveBtn.setText('保活')
    floatyWidget.buyBtn.setText('抢购')
  })
  if(loginThread) {
    loginThread.interrupt()
    loginThread = null
  }
  if(buyThread) {
    buyThread.interrupt()
    buyThread = null
  }
  if(keepAliveThread) {
    keepAliveThread.interrupt()
    keepAliveThread = null
  }
  if(waitForLoginThread) {
    waitForLoginThread.interrupt()
    waitForLoginThread = null
  }
  if(autoLoginThread) {
    autoLoginThread.interrupt()
    autoLoginThread = null
  }
}

//切换登录过期监听
// function toggleListenLoginExpire() {

//   if(!loginExpireThread) {
//     console.log('开始监听登录过期');
//     loginExpireThread = threads.start(function() {
//       textMatches('登录/注册').waitFor()
//       // let page = getPage()
//       // if(page && page.name == '我的') {
//       //   myClick('商城', true)
//       //   sleep(1000)
//       // }
//       while(true) {
//         // myClick('我的', true)
//         // sleep(1000)
//         let loginBtn = textMatches('登录/注册').findOne(1)
//         let personLoginBtn = textMatches('个人登录').findOne(1)
//         if(personLoginBtn) {
//           enableLoginThread()
//         }else if(loginBtn){
//           loginBtn.click()
//           sleep(1000)
//           if(textMatches('个人登录').findOne(1)) {
//             enableLoginThread()
            
//           } 
//         }
//         // myClick('商城', true)
//         sleep(2000)
//       }
//     })
//   }else {
//     let tempThread = loginExpireThread
//     loginExpireThread = null
//     tempThread.interrupt()
//   }
// }

//关闭登录过期监听
function disableListenLoginExpire() {
  if(loginExpireThread) {
    console.log('关闭登录过期监听')
    let tempThread = loginExpireThread
    loginExpireThread = null
    tempThread.interrupt()
  }
}

//开始监听登录过期
function enableListenLoginExpire() {
  if(!loginExpireThread) {
    console.log('开始监听登录过期');
    loginExpireThread = threads.start(function() {
      textMatches('登录/注册').waitFor()
      console.log('监听到登录/注册按钮， 登录已过期，开始重新登录')
      enableLoginThread()
    })
  }
}

ui.logSwitch.on('check', (checked)=> {
  if(checked) {
    threads.start(()=> {
      console.setPosition(30, 300)
      console.show()
    })
  }else {
    threads.start(()=> {
      console.hide()
    })
  }
})

function enableBuyThread() {
  if(!isBuy) {
    if(isInPage('商品详情')) {
      isBuy = true
      floatyWidget.buyBtn.setText('取消抢购')
      buyThread = threads.start(buyFunc)
    }else {
      toast('请打开任意一个商品的商品详情页')
      return
    }
  }
}

function enableAirportBuyThread() {
  if(!isBuy) {
    if(isInPage('结算')) {
      isBuy = true
      floatyWidget.buyBtn.setText('取消抢购')
      airportBuyThread = threads.start(startAirportBuy)
    }else {
      toast('进入购物车页面')
      return
    }
  }
}

function disableBuyThread() {
  if(isBuy){
    if(buyThread) {
      console.log('取消抢购')
      let tempThread = buyThread
      buyThread = null
      tempThread.interrupt && tempThread.interrupt()
    }
    isBuy = false
    ui.run(()=> {
      floatyWidget.buyBtn.setText('抢购')
    })
  }
}

function disableAirportBuyThread() {
  if(isBuy){
    if(buyThread) {
      console.log('取消抢购')
      let tempThread = startAirportBuy
      buyThread = null
      tempThread.interrupt && tempThread.interrupt()
    }
    isBuy = false
    ui.run(()=> {
      floatyWidget.buyBtn.setText('抢购')
    })
  }
}

function toggleBuyThread() {
  if(!isBuy) {
    enableBuyThread()
  }else {
    disableBuyThread()
  }
}

ui.floatySwitch.on('check', floatyFunc)

function floatyFunc(checked) {
  if(checked) {
    if(!floaty.checkPermission()) {
      ui.floatySwitch.checked = false
      floaty.requestPermission()
    }else {
      floatyThread = threads.start(function() {
        let isLogin = false;
        isBuy = false
        floatyWidget = floaty.rawWindow(
          <vertical gravity="center">
            <horizontal>
              <vertical margin="0">
                <button id="loginBtn" margin="0" w="90" text="开始登录" h="40" style="Widget.AppCompat.Button.Colored"></button>
                <button id="buyBtn" margin="0" text="抢购" h="40" style="Widget.AppCompat.Button.Colored"></button>
                
                {/* <button id="test" text="测试" style="Widget.AppCompat.Button.Colored" w="auto"></button> */}
              </vertical>
              <vertical>
                <button id="timeBtn" h="40" text="开始计时"></button>
                <text color="#ffffff" gravity="center" id="time" h="26" margin="4 6" bg="#65000000"> 30:00</text>
              </vertical>
             
              <vertical>
                <button gravity="center" h="40" w="70" layout_gravity="right" id="shake" text="提醒:开" style="Widget.AppCompat.Button.Colored"></button>
                <button h="40" id="keepAliveBtn" text="保活"></button>
              </vertical>
              <vertical>
                <button id="closeFloaty" w="60" h="40" text="关闭" style="Widget.AppCompat.Button.Colored"></button>
              </vertical>
            </horizontal>
          </vertical>
        )
        // console.show()
        // console.setPosition(30, 380);  //设置起始位置 x,y

        floatyWidget.setPosition(20,20)
        // console.show()
        // if(ui.submitIntervalInput.text()) {
        //   let tempTime = ui.submitIntervalInput.text()
        //   //正则 tempTime的值为数字或者小数
        //   let regexp = /^[0-9]+(.[0-9]+)?$/
        //   if(regexp.test(tempTime)) {
        //     submitIntervalTime = tempTime
        //   }else {
        //     submitIntervalTime = 0
        //     ui.submitIntervalInput.setText('0')
        //   }
        // }


        
        //保活按钮
        floatyWidget.keepAliveBtn.on('click', toggleKeepAliveThread)
        //关闭悬浮窗
        floatyWidget.closeFloaty.on('click', ()=> {
          floatyThread.interrupt();
          floatyThread = null;
          ui.run(()=> {
            ui.floatySwitch.checked = false
          })
          console.log('关闭所有进程')
          threads.shutDownAll()
          console.log('关闭悬浮窗，可以在软件里重新打开')
          floatyWidget.close();
          floatyWidget = null;
        })
        //登录按钮方法
        floatyWidget.loginBtn.on('click', toggleLoginThread)

        floatyWidget.buyBtn.on('click', toggleBuyThread)
        floatyWidget.shake.on('click', ()=> {
          toggleNotify()
        })
        //测试按钮
        // floatyWidget.test.on('click', ()=> {
        //   enableKeepAliveThread()
        // })        
        
        floatyWidget.timeBtn.on('click', ()=> {
          if(timerThread) {
            stopTimer()
            return
          }else {
            startTimer()
          }
        })
      })
    }
  }else {
    if(floatyThread) {
      floatyWidget.close();
      floatyThread.interrupt();
      floatyThread = null;
      floatyWidget = null;
    }
  }
}

// ui.airportFloatySwitch.on('check', airportFloatyFunc)


let airportFloatyThread = null;
// function airportFloatyFunc(checked) {
//   console.log('airportFloatyFunc', checked)
//   if(checked) {
//     if(!floaty.checkPermission()) {
//       ui.airportFloatySwitch.checked = false
//       floaty.requestPermission()
//     }else {
//       airportFloatyThread = threads.start(function() {
//         floatyWidget = floaty.rawWindow(
//           <vertical gravity="center">
//             <horizontal>
//               <vertical>
//                 <button id="buyBtn" margin="0" text="抢购" h="40" style="Widget.AppCompat.Button.Colored"></button>
//                 <button id="closeFloaty" w="60" h="40" text="关闭" style="Widget.AppCompat.Button.Colored"></button>
//               </vertical>
//             </horizontal>
//           </vertical>
//         )
//         // console.show()
//         // console.setPosition(30, 380);  //设置起始位置 x,y
        
//         floatyWidget.setPosition(20,20)
//         floatyWidget.closeFloaty.on('click', ()=> {
//           airportFloatyThread.interrupt();
//           airportFloatyThread = null;
//           ui.run(()=> {
//             ui.floatySwitch.checked = false
//           })
//           console.log('关闭所有进程')
//           threads.shutDownAll()
//           console.log('关闭悬浮窗，可以在软件里重新打开')
//           floatyWidget.close();
//           floatyWidget = null;
//         })

//         floatyWidget.buyBtn.on('click', toggleAirPortBuy)
//         threads.start(airportAutoBuy) 
//       })
//     }
//   }else {
//     console.log('关闭所有进程')
//     if(airportFloatyThread) {
//       floatyWidget.close();
//       airportFloatyThread.interrupt();
//       airportFloatyThread = null;
//       floatyWidget = null;
//     }
//   }
// }


// function toggleAirPortBuy() {
//   console.log('toggleAirPortBuy')
//   if(!isBuy) {
//     enableAirportBuyThread()
//   }else {
//     disableAirportBuyThread()
//   }
// }

function startAirportBuy() {
  console.show()
  let settles = textMatches('结算').find()
  let totals = textMatches('合计：.*').find()
  console.log('totals.length', totals.length)
  console.log('settles.length', settles.length)
  let target = null
  if (totals.length > 0) {
    for (let i = 0; i < totals.length; i++) {
      let total = totals[i]
      let total_text = total.text()
      let total_num = total_text.match(/\d+/g)[0]
      if (total_num > 0) {
        target = total
        console.log(total_num)
        break;
      }
    }
  }

  if (target) {
    let target_top = target.bounds().top
    let targetSettle_distance = 100000
    let targetSettle = null
    settles.forEach(function (settle) {
      let distance = Math.abs(settle.bounds().top - target_top)
      if (distance < targetSettle_distance) {
        targetSettle_distance = distance
        targetSettle = settle
      }
    })
    while(true) {
      targetSettle.click()
      sleep(random(1000, 2000))
    }
  } else {
    toast('没有一个被勾选')
  }
}

function airportAutoBuy() {
  const tarGetHour = 11
  const tarGetMinute = 30
  console.log('开启自动购买进程，请在'+ tarGetHour +'点'+ tarGetMinute +'分之前进入商品详情页')
  textMatches('结算').waitFor()
  console.log('检测到结算页，开启自动购买')
  while(true) {
    let timeGap = 0
    var res = http.get('http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp')
    let body = res.body.json()
    let nowTimeStamp = parseInt(body.data.t)
    let nowTime = new Date(nowTimeStamp)
    console.log('服务器时间：' + nowTime.toISOString())
    nowTime.setHours(tarGetHour)
    nowTime.setMinutes(tarGetMinute)
    nowTime.setSeconds(0)
    nowTime.setMilliseconds(0)
    timeGap = nowTime.getTime() - nowTimeStamp
    if(timeGap < 0) {
      console.log('今天抢购已结束')
      if(autoBuyThread) {
        let thread = autoBuyThread
        autoBuyThread = null
        thread.interrupt()
      }
      return
    }
    if(timeGap < 200) {
      console.log('时间已到 冲')
      enableAirportBuyThread()
      if(autoBuyThread) {
        let thread = autoBuyThread
        autoBuyThread = null
        thread.interrupt()
      }
      return
    }
    if(timeGap > 120000) {
      sleep(60000)
    }else if(timeGap > 10000) {
      sleep(5000)
    }else  {
      sleep(100)
    }
  }
}

//负责切换进程开关的放这里

function toggleLoginThread() {//切换登录进程开关
  console.log('loginThread:' + loginThread)
  if(loginThread) {//如果login线程在运行
    disableLoginThread()
  }else {
    enableLoginThread()
  }
}

function enableLoginThread() {
  if(loginThread) return
  closeAuthorizationThread && closeAuthorizationThread.interrupt()//关掉关闭授权的进程
  closeAuthorizationThread = null
  loginThread = threads.start(loginFunc)
  ui.run(()=> {
    floatyWidget.loginBtn.setText(loginBtnTexts.disableLogin)
  })
}

function disableLoginThread() {
  if(!loginThread) return
  ui.run(()=> {
    floatyWidget.loginBtn.setText(loginBtnTexts.enableLogin)
  })
  console.log('关闭所有登录相关进程')
  let tempThread = loginThread
  loginThread = null
  killLoginThread()
  tempThread.interrupt()
}

function killLoginThread() {
  clickLoginThread && clickLoginThread.interrupt()
  clickLoginThread = null;
  clickPersonLoginThread && clickPersonLoginThread.interrupt()
  clickPersonLoginThread = null;
  clickAllowBtnThread && clickAllowBtnThread.interrupt()
  clickAllowBtnThread = null;
}



function toggleKeepAliveThread() {
  if(keepAliveThread) {
    isKeepAlive = false
    disableKeepAliveThread()
  }else {
    //创建保活进程
    isKeepAlive = true
    enableKeepAliveThread()
  }
}

function isPass13TimePoint() {
  let now = getServerTime()
  //如果超过13点 就返回true
  if(now.getHours() >= 13) {
    return true
  }
  return false
}

function enableKeepAliveThread() {
  if(!keepAliveThread) {
    keepAliveThread = threads.start(()=> {
      while(true) {
        keepAlice()
        sleep(random(15000, 30000))
      }
    })
    enableListenLoginExpire()
    ui.run(()=> {
      floatyWidget.keepAliveBtn.setText('停止')
    })
  }
}
function disableKeepAliveThread() {
  if(keepAliveThread) {
    ui.run(()=> {
      floatyWidget.keepAliveBtn.setText('保活')
    })
    disableListenLoginExpire()
    let tempThread = keepAliveThread
    keepAliveThread = null
    tempThread.interrupt()
  }
}

let autoClickLoginThread = null
function loginExpire() {
  if(!isInPage('购物车')) {//如果正好在全部订单页面 则切一次页面
    myClick('购物车')
    sleep(300)
  }else {
    myClick('我的')
    sleep(300)
  }
  if(!autoLoginThread) {
    autoLoginThread = threads.start(()=> {
      textMatches('.*个人登录.*').waitFor()
      floatyWidget.loginBtn.setText('停止登录')
      loginThread = threads.start(loginFunc)
    })
  }
  autoClickLoginThread = threads.start(()=> {
    while(true) {
      textMatches('.*登录/注册.*').waitFor()
      textMatches('.*登录/注册.*').findOne(1).click()
    }
  })
}


//停止计时器
function stopTimer() {
  ui.run(()=> {
    floatyWidget.timeBtn.setText('开始计时')
    floatyWidget.time.setText('30:00')
  })
  threads.start(()=> {
    let page = getPage()
    if(page && page.name === '我的') {
      myClick('商城', true)
      sleep(1000)
    }
    myClick('我的', true)
  })
  if(timerThread) {
    timerThread.interrupt()
    timerThread = null
  }
}
function startTimer() {
  if(timerThread) return
  timerThread = threads.start(timerFunc)
}

function timerFunc() {
  ui.run(function() {
    floatyWidget.timeBtn.setText('停止计时')
  })
  var target_ms = 1800000//现在与目标时间相差毫秒数
  var target_time = new Date(new Date().getTime() + target_ms)
  //换算毫秒
  var min_ms = 60000;
  let interval = 1000
  while(true) {
    let now_time = new Date()
    let gap = target_time - now_time
    if(gap <= 0) {
      notify()
      stopTimer()
      loginExpire()
      return
    }
    let min = Math.floor((gap) / min_ms)
    let sec = Math.floor((gap) % min_ms / 1000)
    //不到10前面加0
    if(min < 10) {
      min = '0' + min
    }
    if(sec < 10) {
      sec = '0' + sec
    }
    ui.run(function() {
      floatyWidget.time.setText(min + ':' + sec)
    })
    interval = gap % 1000
    sleep(interval)
  }
}

function createCloseAuthorizationThread() {
  if(closeAuthorizationThread) {
    return
  }
  console.log('开启20秒的登录保护进程防止重复登录')
  threads.start(()=> {
    closeAuthorizationThread = threads.start(()=> {
      while(true) {
        textMatches('.*获取你的昵称.*').waitFor()
        if(!loginThread) {//如果不在登录状态 就点拒绝 去关掉授权窗口
          textMatches('.*拒绝.*').findOne(1).click()
          sleep(1000)
        }
      }
    })
    closeAuthorizationThread.join(20000)//20秒后杀死他
    let tempThread = closeAuthorizationThread
    closeAuthorizationThread = null
    tempThread && tempThread.interrupt()
  })
}

//消息提醒
function notify(isDisposable){
  if(!isDisposable) isDisposable = false
  if(!isNotify) {//如果关闭了声音震动
    return
  }
  function vibrate() {
    let duration = 2000
    device.vibrate(duration)
  }
  if(isDisposable) {
    disableNotify()
  }         
  try{
    vibrate()
    playMusic()
  }catch(error) {
    console.log(error)
  }
  function playMusic() {
    console.log('播放铃声');
    media.playMusic("./music/music.mp3");
  }
}

// if(auto.service != null) {
//   ui.barrierFreeSwitch.checked = true
// }

ui.barrierFreeSwitch.on('check', (checked)=> {
  // 用户勾选无障碍服务的选项时，跳转到页面让用户去开启
  if (checked && auto.service == null) {
    app.startActivity({
        action: "android.settings.ACCESSIBILITY_SETTINGS"
    });
  }
  if (!checked && auto.service != null) {
      auto.service.disableSelf();
  }
})


function isInPage(title) {
  if (!title) return false
  let page = textMatches('.*' + title + '.*').findOne(1)
  if (page) {
    return true
  }
  return false
}

function isInTabBar(title) {
  if (!title) return false
  let page = boundsInside()
  if (page) {
    return true
  }
  return false
}

function myClick(item, noRandom) {
  let clickText = ''//文本提示
  if(!noRandom) {
    noRandom = false
  }
  if (typeof item === 'string') {
    clickText = item
    item = textMatches('.*' + item + '.*').findOne(1)
  }
  if (item === null || item === undefined) {
    return item
  }
  clickText = item.text()
  if(noRandom) {
    clickText && console.log('点击:' + clickText)
    return item.click()
  }
  let bound = item.bounds()
  console.log('随机点击:' + clickText)
  return click(bound.centerX() + random(10, 10), bound.centerY() + random(10, 10))
}

function buyFunc() {
  //是否再商品详情页
  function isInDetailPage() {
    let detail = textMatches('.*商品详情.*').findOne(1)
    if (detail) {
      return true
    }
  }

  function buyBtn() {
    if (isInPage('确认订单')) {
      console.log('在订单页')
      if(isInPage('订单备注')) {//有积分页面
        console.log('可以提交订单了');
        myClick('提交订单')
        notify(true)
      }else {//当前页面没加载完成判断是否有HTTP[504]错误
        // let error504 = textContains("[504]").findOne(1)
        // if(error504) {
        //   back()
        // }else if(textContains("[undefined]").findOne(1)) {
        //   back()
        // }
      }
    }
    else if (isInDetailPage()) {
      console.log('在商品详情页');
      myClick('立即购买')
      sleep(300)
      myClick('确定')
    }
  }
  while(true) {
    try {
      buyBtn()
    } catch (e) {
      console.log(e)
    }
    sleep(500)
  } 
}

let listenLoginSuccessThread = null;//监听登录成功的线程
let listenLoginSuccessThread2 = null;
let authorThread = null;

function loginFunc() {
  if(keepAliveThread) {
    disableKeepAliveThread()
  }
  // listenLoginSuccessThread2 = threads.start(()=> {
  //   while(true) {
  //     let currentPage = getPage()
  //     if(currentPage.title === '个人中心') {
  //       let pointsContainer = textMatches('.*积分.*').findOne(1).parent().children()
  //       let points = pointsContainer[pointsContainer.length - 2].text()
  //       //points是数字
  //       console.log(points);
  //       if(/^[0-9]*$/.test(points)) {
  //         console.log('登录成功2')
  //         loginSuccessCallBack()
  //         listenLoginSuccessThread && listenLoginSuccessThread.interrupt()
  //         authorThread && authorThread.interrupt()
  //         listenLoginSuccessThread2 && listenLoginSuccessThread2.interrupt()
  //       }
  //     }
  //     sleep(1000)
  //   }
  // })
  if(!textMatches('个人登录').findOne(1)) {
    if(textMatches('登录/注册').findOne(1)) {
      console.log('侦测到登录/注册按钮');
      myClick(textMatches('登录/注册').findOne(1))
      sleep(500)
    }else {
      toast('请到我的页面进行登录')
    }
  }

  if(autoLoginThread) {
    autoLoginThread.interrupt()
    autoLoginThread = null
  }

  console.log('开始登录')
  function loginPerson() {
    if(textMatches('获取你的昵称、头像').findOne(1)) {
      myClick(textMatches('.*允许.*').findOne(1))
      sleep(600)
      return
    }
    if(!textMatches('个人登录').findOne(1)) {
      console.log('侦测不到登录框')
      if(textMatches('登录/注册').findOne(1)) {
        myClick('登录/注册')
        console.log('点击登录/注册 唤起登录框');
      }
      textMatches('个人登录').waitFor()
      console.log('重新侦测到登录框，开始登录');
      sleep(300)
    }
    if(!textMatches('获取你的昵称、头像').findOne(1)) {//如果不在授权框下就唤出授权框
      textMatches('个人登录').waitFor()
      console.log('点击登录按钮')
      myClick(textMatches('.*个人登录.*').findOne(1))
      textMatches('获取你的昵称、头像').waitFor()
      sleep(500)
    }
    myClick(textMatches('.*允许.*').findOne(1))
  }
  function loginSuccessCallBack() {
    console.log('登录成功')
    notify(true)
    startTimer()
    disableLoginThread()
    console.log('三秒后自动开始保活')
    sleep(3000)
    enableKeepAliveThread()
    createCloseAuthorizationThread()
  }
  listenLoginSuccessThread = threads.start(()=> {
    console.log('开始登录监听提示')
    textMatches('登录成功').waitFor()
    console.log('监听到登录成功提示')
    loginSuccessCallBack()
    authorThread && authorThread.interrupt()
    listenLoginSuccessThread2 && listenLoginSuccessThread2.interrupt()
    listenLoginSuccessThread && listenLoginSuccessThread.interrupt()
  })
  clickLoginThread = threads.start(()=> {
    console.log('点击登录/注册按钮进程启动')
    while(true) {
      if(!textMatches('获取你的昵称、头像').findOne(1)) {
        if(!textMatches('个人登录').findOne(1)) {
          if(textMatches('登录/注册').findOne(1)) {
            console.log('点击登录/注册按钮');
            myClick(textMatches('登录/注册').findOne(1))
          }
        }
      }
      sleep(random(800, 1000))
    }
  })
  clickPersonLoginThread = threads.start(()=> {
    console.log('点击个人登录按钮进程启动');
    while(true) {
      if(!textMatches('获取你的昵称、头像').findOne(1)) {
        if(textMatches('个人登录').findOne(1)) {
          myClick(textMatches('个人登录').findOne(1))
        }
      }
      sleep(random(100,200))
    }
  })
  clickAllowBtnThread = threads.start(()=> {
    console.log('点击允许按钮进程启动');
    while(true) {
      textMatches('获取你的昵称、头像').waitFor()
      console.log('点击允许按钮')
      sleep(random(200,400))
      myClick(textMatches('允许').findOne(1))
      sleep(300)
    }
  })
}


// function main() {
//   if(!floaty.checkPermission()) {
//     floaty.requestPermission()
//   }
// }

// main()