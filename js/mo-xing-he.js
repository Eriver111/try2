/**
 * 水墨星河 — Canvas 三层动态背景
 * 底层：墨色柔光云雾缓慢流动
 * 中层：细密星辰光点闪烁
 * 顶层：极淡墨迹纹理偶尔飘过
 * 用法：<canvas id="mxhCanvas"></canvas>
 *        MoXingHe.start('mxhCanvas');
 */
var MoXingHe = (function(){
  var canvas, ctx, w, h, raf, running=false;
  var clouds=[], stars=[], inkStrokes=[];
  var CLOUD_COUNT=8, STAR_COUNT=120, STROKE_COUNT=4;
  var pointer={x:0.5,y:0.5, tx:0.5,ty:0.5}; // mouse/touch parallax

  // === 墨色云雾 ===
  function Cloud(){
    this.x=Math.random()*1.5-0.25; this.y=Math.random()*1.2-0.1;
    this.r=0.18+Math.random()*0.35; // 0.18-0.53 (相对屏幕)
    this.alpha=0.012+Math.random()*0.025;
    this.vx=(Math.random()-0.5)*0.00015;
    this.vy=(Math.random()-0.5)*0.00010;
    this.color=Math.random()<0.5?'gold':'ink';
    this.colorAlpha=this.color==='gold'?0.03:0.025;
  }
  Cloud.prototype.update=function(){
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<-0.5)this.x=1.5; if(this.x>1.5)this.x=-0.5;
    if(this.y<-0.3)this.y=1.3; if(this.y>1.3)this.y=-0.3;
  };
  Cloud.prototype.draw=function(){
    var cx=this.x*w, cy=this.y*h, r=this.r*Math.min(w,h);
    var g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    if(this.color==='gold'){
      g.addColorStop(0,'rgba(201,168,76,'+this.colorAlpha+')');
      g.addColorStop(1,'rgba(201,168,76,0)');
    }else{
      g.addColorStop(0,'rgba(140,130,110,'+this.colorAlpha+')');
      g.addColorStop(1,'rgba(140,130,110,0)');
    }
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  };

  // === 星辰光点 ===
  function Star(){
    this.reset();
    this.phase=Math.random()*Math.PI*2;
    this.speed=0.003+Math.random()*0.012;
  }
  Star.prototype.reset=function(){ this.x=Math.random(); this.y=Math.random(); };
  Star.prototype.update=function(){
    this.phase+=this.speed;
  };
  Star.prototype.draw=function(){
    var alpha=0.15+0.25*Math.abs(Math.sin(this.phase));
    var sz=1+Math.sin(this.phase*2.3)*0.6;
    ctx.fillStyle='rgba(220,200,150,'+alpha+')';
    ctx.beginPath(); ctx.arc(this.x*w,this.y*h,sz,0,Math.PI*2); ctx.fill();
  };

  // === 墨迹纹理 ===
  function InkStroke(){
    this.reset();
  }
  InkStroke.prototype.reset=function(){
    this.x=-0.15; this.y=Math.random()*0.7+0.15;
    this.len=0.08+Math.random()*0.18;
    this.alpha=0.008+Math.random()*0.018;
    this.speed=0.00025+Math.random()*0.0004;
    this.rot=Math.random()*0.3-0.15;
  };
  InkStroke.prototype.update=function(){
    this.x+=this.speed;
    if(this.x>1.2)this.reset();
  };
  InkStroke.prototype.draw=function(){
    ctx.save();
    ctx.translate(this.x*w,this.y*h); ctx.rotate(this.rot);
    var lw=2+Math.random()*3; ctx.strokeStyle='rgba(180,170,150,'+this.alpha+')';
    ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(0,0);
    ctx.quadraticCurveTo(this.len*w*0.5,(Math.random()-0.5)*30,this.len*w,(Math.random()-0.5)*20);
    ctx.stroke(); ctx.restore();
  };

  // === 主循环 ===
  function resize(){
    if(!canvas)return; w=canvas.offsetWidth; h=canvas.offsetHeight;
    canvas.width=w; canvas.height=h;
  }
  function loop(){
    if(!running)return;
    // 鼠标视差跟随
    pointer.x+=(pointer.tx-pointer.x)*0.02;
    pointer.y+=(pointer.ty-pointer.y)*0.02;

    ctx.clearRect(0,0,w,h);

    // 底层：墨色氛围底
    var g0=ctx.createRadialGradient(w*0.5,h*0.35,0,w*0.5,h*0.35,Math.max(w,h));
    g0.addColorStop(0,'rgba(15,12,8,0.0)');
    g0.addColorStop(0.4,'rgba(15,12,8,0.6)');
    g0.addColorStop(1,'rgba(8,6,4,0.95)');
    ctx.fillStyle=g0; ctx.fillRect(0,0,w,h);

    // 云雾层
    for(var i=0;i<clouds.length;i++){clouds[i].update();clouds[i].draw();}

    // 星辰层
    for(var i=0;i<stars.length;i++){stars[i].update();stars[i].draw();}

    // 墨迹纹理层
    for(var i=0;i<inkStrokes.length;i++){inkStrokes[i].update();inkStrokes[i].draw();}

    // 极淡金纹飘过（视差）
    ctx.save();
    var px=(pointer.x-0.5)*16,py=(pointer.y-0.5)*12;
    ctx.translate(px,py);
    var gr=ctx.createLinearGradient(0,h*0.15,w*0.6,h*0.25);
    gr.addColorStop(0,'rgba(201,168,76,0)');
    gr.addColorStop(0.5,'rgba(201,168,76,'+(0.005+Math.sin(Date.now()*0.0003)*0.003)+')');
    gr.addColorStop(1,'rgba(201,168,76,0)');
    ctx.fillStyle=gr; ctx.fillRect(w*0.2,h*0.15,w*0.6,h*0.08);
    ctx.restore();

    raf=requestAnimationFrame(loop);
  }

  function init(canvasId){
    canvas=document.getElementById(canvasId);
    if(!canvas)return;
    ctx=canvas.getContext('2d');
    resize();
    window.addEventListener('resize',resize);

    // 初始化粒子
    clouds=[];stars=[];inkStrokes=[];
    for(var i=0;i<CLOUD_COUNT;i++)clouds.push(new Cloud());
    for(var i=0;i<STAR_COUNT;i++)stars.push(new Star());
    for(var i=0;i<STROKE_COUNT;i++)inkStrokes.push(new InkStroke());

    // 鼠标/触摸视差
    document.addEventListener('mousemove',function(e){pointer.tx=e.clientX/w;pointer.ty=e.clientY/h;});
    document.addEventListener('touchmove',function(e){pointer.tx=e.touches[0].clientX/w;pointer.ty=e.touches[0].clientY/h;},{passive:true});

    running=true;
    loop();
  }

  function stop(){running=false;if(raf)cancelAnimationFrame(raf);}

  return {start:init,stop:stop};
})();