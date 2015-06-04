var width, height, screenWidth, scrollSum, lastSectionIndex = -1, videoScale = 1.12;

var sections = [];

function init() {
    
    initSections();
    scrollSum = _.reduce(sections, function(memo, d){ return memo + d.duration;}, 0);

    setSize();
    setScrollHeight();

    $(window).bind("resize", setSize);
    $(window).bind("scroll", onScroll);
}

var initSections = function() {

    var sectionOffset = 0;

    $(".section").each(function(i){
        
        var section = this;
        
        var dataDuration = function(elem, index, offset) {

            var val = parseFloat($(elem).attr("data-duration"));

            var stop = $(elem).attr("data-stop"); 

            return {    
                        index: index, 
                        duration: val,
                        offset: offset,
                        start: index + offset,
                        end: index + offset + val,
                        navStopPoint: stop ? parseFloat(stop) : 0
                    }
        }

        var sectionData = dataDuration(section, i, sectionOffset);

        var scenes = $(section).find(".scene");

        if (scenes.length > 0) {

             var sceneOffset = 0;

             sectionData.scenes = [];

            $(scenes).each(function(j){

                var scene = this;

                var sceneData = dataDuration(scene, j, sceneOffset);

                var aniObjects = $(scene).find(".animate-object");

                if (aniObjects.length > 0) {

                    sceneData.objects = []

                    $(aniObjects).each(function(k){

                        var aniObject = this;

                        var callFunc = $(aniObject).attr("data-callfunc") ? eval('({' + $(aniObject).attr("data-callfunc") + '})') : null;

                        sceneData.objects.push({
                            elem: aniObject,
                            duration: parseFloat($(aniObject).attr("data-duration")),
                            start: parseFloat($(aniObject).attr("data-start")),
                            styleStart: eval('({' + $(aniObject).attr("data-style-start") + '})'),
                            styleEnd: eval('({' + $(aniObject).attr("data-style-end") + '})'),
                            isAnimating: true,
                            callFunc: callFunc,
                            callFuncActive: false
                        });

                    });

                }

                sectionData.scenes.push(sceneData);

                sceneOffset += (sceneData.duration - 1);
            });
        }
        
        sections.push(sectionData);

        sectionOffset += (sectionData.duration - 1);
    });

}


function setSize(){

    var prevHeight = height ? height : $(".view").outerHeight();

    screenWidth = Math.max($(".view").outerWidth(), 1024);

    width = Math.max(screenWidth * 1.25);
    height = Math.max($(".view").outerHeight(), 640);
    
    $(".section").outerWidth(width);
    $(".scroll-horizontal").outerWidth(width * $(".section").length);
    
    $(".scene").outerWidth(screenWidth);
    $(".scene-scroll").each(function(){
        $(this).outerWidth(screenWidth * $(this).find(".scene").length);
    });

    resizeBG();

    if (prevHeight != height) {

        var prevScrollTop = $(window).scrollTop();
        
        setScrollHeight();

        var adjustScroll = function(){
            return (prevScrollTop * height)/prevHeight;
        }

        $(window).scrollTop(adjustScroll);
    } 

    if ($(window).scrollTop() != 0) {
        setScrollPosition();
    }
        
}

function resizeBG(){

    var svgWidth = $("svg.bg").first().outerWidth();

    var isWide = (svgWidth/height > 25/9) ? true : false;

    var bgWidth = isWide ? svgWidth :(25 * height)/9;

    var bgHeight = isWide ? (9 * bgWidth)/25 : height;

    var scale = isWide ? bgHeight/900 : bgWidth/2500;

    var xPos = isWide ? 0 : (svgWidth - bgWidth)/2;

    var yPos = isWide ? (height - bgHeight)/2 : 0;


    $(".bg__wrap").attr({transform: "scale("+scale+") translate("+xPos+","+yPos+")"});

    $("#clip-poly").attr("points", (svgWidth-width)+",0 0,"+height+" "+bgWidth+","+height+" "+bgWidth+","+0);

    $("#vid-loop").height(bgHeight * videoScale).css({transform:"translate(-3.9%,6.4%)"});

    $(".lines__svg").each(function(){

        var widthRatio = (parseFloat($(this).attr("data-width")) - (xPos/10))/2500 ;
        var heightRatio = (parseFloat($(this).attr("data-height")) - (yPos/10))/900;

        $(this).attr({width: bgWidth * widthRatio , height: bgHeight * heightRatio, transform:"translate("+0+", 0)"});

    });

}

function setScrollHeight(){

    $(".scroll-vertical").height(scrollSum * height);

}

function setScrollPosition(){

    var scrollAt = $(window).scrollTop()/height;

    var currentSection = _.find(sections, function(d) { return d.start <= scrollAt && d.end >= scrollAt;});

    var sectionChanged = !!(currentSection.index != lastSectionIndex);

    lastSectionIndex = currentSection.index;

    var pauseScroll = function(){ return !!(currentSection.end - scrollAt > 1) };

    if ( pauseScroll() ) {

        //Freeze on a section and scroll/animate inner scenes

        $(".scroll-horizontal").css({left: currentSection.index * -(width)})
        
    }
    else {

        //Scroll to the next section
        
        var scrollLeft = currentSection.duration > 1 ? scrollAt - currentSection.offset - (currentSection.duration-1) :
            scrollAt - currentSection.offset;

        $(".scroll-horizontal").css({left: scrollLeft * -width});
        
    }

    //Scroll inner scenes
    if (currentSection.scenes) {
        scrollScenes({
            section: currentSection,
            scrollAt: scrollAt,
            createNav: sectionChanged
        });
    } else {
        $(".sub-nav").removeClass("active");
    }
}

function onScroll() {
    setScrollPosition();
}

function scrollScenes(state) {

    var sceneAt = state.scrollAt - state.section.start;

    var currentScene = _.find(state.section.scenes, function(d) { return d.start <= sceneAt && d.end >= sceneAt;});

    if (currentScene) {

        var pauseScroll = function(){ return !!(currentScene.end - sceneAt > 1) };

        if (pauseScroll()) {

            $(".scene-scroll").css({left: currentScene.index * -(screenWidth)})

        } else {

            var scrollLeft = currentScene.duration > 1 ? sceneAt - currentScene.offset - (currentScene.duration-1) :
                sceneAt - currentScene.offset;

            $(".scene-scroll").css({left: scrollLeft * -screenWidth});

        }  
        var nextScene = state.section.scenes[currentScene.index + 1];

        var animateObjects = currentScene.objects.concat(nextScene ? nextScene.objects : []);

        _.each(animateObjects, function(d){

            var transformObj = {};

            if (!d) { return; }

            d.end = d.start + d.duration;

            if (d.start <= sceneAt && d.end >= sceneAt) {

                _.each(d.styleStart, function(v, k){

                    var unit = (typeof d.styleStart[k] === "string") ? d.styleStart[k].match(/\D+$/)[0] : 0;

                    var getNum = function(n) { 
                        return (typeof n === "string") ? parseFloat(n.match(/-?\d+/)[0]) : n;
                    }

                    var startVal = getNum(d.styleStart[k]);
                    var endVal = getNum(d.styleEnd[k]);

                    var getVal = function() {
                        
                        return Math.abs(endVal - startVal) * (endVal > startVal ? sceneAt - d.start : d.end - sceneAt)/d.duration;    
                    }

                    transformObj[k] = getVal() + (endVal > startVal ? startVal : endVal) +  unit;
                    
                })

                $(d.elem).css(transformObj);

                d.isAnimating = true;

                if (d.callFunc && !d.callFuncActive) {
                    
                    window[d.callFunc.call](d.callFunc.arg, d.callFunc.activate);

                    d.callFuncActive = true;
                }
            } 
            else if (d.isAnimating) {

                transformObj = d.end < sceneAt ? d.styleEnd : d.styleStart;

                $(d.elem).css(transformObj);

                d.isAnimating = false;

                if (d.start > sceneAt && d.callFuncActive) {

                    window[d.callFunc.call](d.callFunc.arg, (d.callFunc.activate==="true" ? "false" : "true"));

                    d.callFuncActive = false;
                }
            }

        });

        if (state.createNav) {

            createNavScenes({
                scenes: state.section.scenes,
                currentScene: currentScene,
                sceneAt: sceneAt
            });
        } else {
            
            $(".sub-nav__item").removeClass("active").eq(currentScene.index).addClass("active");
        }
    
    } 
}

function createNavScenes(state) {

    $(".sub-nav").html("");

    _.each(state.scenes, function(d, i){
        
        var isActive = state.currentScene.index === d.index ? "active":"";

        $(".sub-nav").append("<div class='sub-nav__item "+isActive+"' data-scene="+(d.offset + d.navStopPoint + (i > 0 ? state.scenes[i-1].duration : 0))+"></div>");
    });

    $(".sub-nav__item").on("click", function(){
        scrollToArea($(this).attr("data-scene"));
    });

    if(state.currentScene.index > 1) {
        showSubNav();
    }
}


function scrollToArea(position) {

    var scrollPos = position * (height + 1);
    var distance = Math.abs($(window).scrollTop() - scrollPos);

    $("html, body").stop().animate({scrollTop: scrollPos }, distance/2);
}


function animatePeople(cls, activate) {

    if (!cls) {return};

    var bg = document.getElementById("people-highlight__mask");
 
    if (activate === "true") {
        
        bg.classList.add(cls);

        $("."+cls+", .bg-wrapper").addClass("active");
    } else {
        
        bg.classList.remove(cls);
        
        $("."+cls+", .bg-wrapper").removeClass("active");

        if (cls==="showSegmentedAandB") {
            $(".showSegmentedA, .bg-wrapper").addClass("active");
        }
    }
}

function bubbleLines(cls, activate) {

    if (!cls) {return};

    if (activate === "true") {
        $(".about__end--wrapper").addClass(cls);
    } else {
        $(".about__end--wrapper").removeClass(cls);

        if (cls==="mobileToAgent mobileToVideo") {
            $(".about__end--wrapper").attr("class", "about__end--wrapper position-center");
        }
    }
}

function showSubNav() {
    $(".sub-nav").addClass("active");
}

function videoFunctions(arg, activate) {
    
    var myVideo = document.getElementById('vid-loop');

    var command = activate === "true" ? arg : arg === "play" ? "pause" : "play";

    if (command === "play") {
        myVideo.play();


    } else {
        myVideo.pause();
    }
}


$(function() {

    init();

    if($(window).scrollTop() < height/150) {
        $(".home__title__cell").addClass("animateIntro");
        $(".home__title__line, .home__title__circle").on('animationend webkitAnimationEnd oAnimationEnd', function() {
            $(this).addClass('active');
        });
    } else {
        $(".home__title__line, .home__title__circle").addClass("active");
    }

    $(".home__title__circle").on("click", function(){
        $("html, body").animate({scrollTop:1.5 * (height + 1) }, 1000);
    });

    $(".end-button").on("click", function(){
        scrollToArea(sections[1].offset + 1);
    });

    videoFunctions("pause");
    
});



