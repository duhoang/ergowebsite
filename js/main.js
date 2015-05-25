var width, height, screenWidth, scrollSum;

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

            return {    index: index, 
                        duration: val,
                        offset: offset,
                        start: index + offset,
                        end: index + offset + val
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

                var aniObjects = $(scene).find(".ani-object");

                if (aniObjects.length > 0) {

                    sceneData.objects = []

                    $(aniObjects).each(function(k){

                        var aniObject = this;

                        sceneData.objects.push({
                            elem: aniObject,
                            duration: parseFloat($(aniObject).attr("data-duration")),
                            start: parseFloat($(aniObject).attr("data-start")),
                            styleStart: eval('({' + $(aniObject).attr("data-style-start") + '})'),
                            styleEnd: eval('({' + $(aniObject).attr("data-style-end") + '})'),
                            isAnimating: true
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
    $(".scene").outerWidth(screenWidth);

    resizeBG();

    if (prevHeight != height) {

        var prevScrollTop = $(window).scrollTop();
        
        setScrollHeight();

        var adjustScroll = function(){
            return (prevScrollTop * height)/prevHeight;
        }

        $(window).scrollTop(adjustScroll);
    } 
        
    setScrollPosition();
}

function resizeBG(){

    var svgWidth = $("svg.bg").first().outerWidth();

    var isWide = (svgWidth/height >= 25/9) ? true : false;

    var bgWidth = isWide ? svgWidth :(25 * height)/9;

    var bgHeight = isWide ? (9 * bgWidth)/25 : height;

    var widthOffset = isWide ? 0 : (svgWidth - bgWidth)/2;

    var heightOffset = isWide ? (height - bgHeight)/2 : 0;

    $(".bg image").attr({width: bgWidth, height: bgHeight, x: widthOffset, y: heightOffset});

    $("#clip-poly").attr("points", (svgWidth-width)+",0 0,"+(bgHeight)+" "+bgWidth+","+(bgHeight)+" "+bgWidth+","+0)

}

function setScrollHeight(){

    $(".scroll-vertical").height(scrollSum * height);

}

function setScrollPosition(){

    var scrollAt = $(window).scrollTop()/height;

    var currentSection = _.find(sections, function(d) { return d.start <= scrollAt && d.end >= scrollAt;});

    var pauseScroll = function(){ return !!(currentSection.end - scrollAt > 1) };

    if ( pauseScroll() ) {

        //Freeze on a section and scroll/animate inner scenes

        $(".scroll-horizontal").css({left: currentSection.index * -(width)})

        scrollScenes({
            section: currentSection,
            scrollAt: scrollAt
        });
        
    }
    else {

        //Scroll to the next section
        
        var scrollLeft = currentSection.duration > 1 ? scrollAt - currentSection.offset - (currentSection.duration-1) :
            scrollAt - currentSection.offset;

        $(".scroll-horizontal").css({left: scrollLeft * -width});

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

            if (d.start <= sceneAt + 1 && d.end >= sceneAt) {

                _.each(d.styleStart, function(v, k){

                    var unit = (typeof d.styleStart[k] === "string") ? d.styleStart[k].match(/\D+$/)[0] : 0;

                    var getNum = function(n) { 
                        return (typeof n === "string") ? parseFloat(n.match(/\d+/)[0]) : n;
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
            } 
            else if (d.isAnimating) {

                transformObj = d.end < sceneAt ? d.styleEnd : d.styleStart;

                $(d.elem).css(transformObj);

                d.isAnimating = false;
            }

        });
    
    }
}


$(function() {

    init();
    
});

