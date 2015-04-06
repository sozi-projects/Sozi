function fireSVGLoaded(eventOwner) {
    var scope = angular.element(eventOwner).scope();
    if(scope != null)
        scope.svgLoaded(eventOwner);
}

function getScreenSize() {
var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
    x = w.innerWidth || e.clientWidth || g.clientWidth,
    y = w.innerHeight|| e.clientHeight|| g.clientHeight;    

    return {screen:{width:x,height:y}};
}
angular.module('DynSVG', ['ngAnimate'])
    .controller('SVGController', function($scope,$http) {
        $scope.loading = true;
        $scope.screen = {};

        $scope.screen = getScreenSize().screen;
        $scope.screenSizes = [
            {width:"?",height:"?",ratio:"custom"},
            {width:1024,height:768,ratio:"4:3"},
            {width:1280,height:720,ratio:"16:9"},
            {width:1400,height:1050,ratio:"4:3"},
            {width:1600,height:900,ratio:"16:9"},
            {width:1600,height:1200,ratio:"4:3"},
            {width:1920,height:1080,ratio:"16:9"},
            {width:1920,height:1440,ratio:"4:3"}
        ];
        $scope.screenSizes[0].width = $scope.screen.width;
        $scope.screenSizes[0].height = $scope.screen.height;

        $scope.selectedScreenSize = $scope.screenSizes[0];

        $scope.presentationModeOn = true;
        this.presentatorShown = false;
        $scope.defaultsLoaded = false;
        $scope.multipleWindowMode = false;

        $scope.switchPresentationMode = function() {
            $scope.presentationModeOn = this.presentationModeOn;
            if($scope.presentationModeOn)
                sozi.events.fire("sozi.startPresentationMode");
            else
                sozi.events.fire("sozi.stopPresentationMode");
        };
        $scope.resetSizeToFullscreen = function() {
            $scope.screen.height = getScreenSize().screen.height;
            $scope.screen.width = getScreenSize().screen.width;

            $scope.screenSizes[0].width = $scope.screen.width;
            $scope.screenSizes[0].height = $scope.screen.height;
        };
        $scope.changeScreenSize = function() {
            $scope.screen.height = this.selectedScreenSize.height;
            $scope.screen.width = this.selectedScreenSize.width;                
        }
        $scope.$watch("presentationModeOn", function() {
            $scope.presentationModeState = $scope.presentationModeOn ? "on":"off";
        });
        $scope.$watchCollection("screen", function() {
            if(!$scope.loading) {
                if(this.event.type == "input") {
                    $scope.screenSizes[0].width = $scope.screen.width;
                    $scope.screenSizes[0].height = $scope.screen.height;
                }

                for(var key in sozi.display.viewPorts) 
                    sozi.display.viewPorts[key].setSize($scope.screen.width,$scope.screen.height);

                sozi.display.updateSize();
            }
        });
    })
    .directive('dynsvg', function($compile,$http) {
        return {
            compile:function() {
                return function(scope,element,attrs) {
                    scope.presentationPath = attrs.src;

                    // reset the templates id to be context specific regarding our dynsvg element
                    element.children()[0].id = attrs.id+"_"+element.children()[0].id;
                    
                    if(scope.defaultFile == null)
                        scope.defaultFile = attrs.defaultFile;

                    scope.svgLoaded = function(element) {
                        var svgNode = element;

                        // Build primary viewports scope
                        scope.$apply(function() {                            
                            scope.date = {};
                            scope.date.today = moment().format("YYYY-MM-DD");

                            // Gather configration - object-elements data-attribute not yet set
                            // this is called first when the template was generated into the DOM
                            if(scope.defaultFile != null && !scope.defaultsLoaded) {
                                $http.get(scope.defaultFile).success(function(response) {
                                    for(var key in response) 
                                        scope[key] = response[key];

                                    scope.defaultsLoaded = true;
                                });                                
                            }
                            // Now compile object-elements children loaded after mustaches where replaced with
                            // settings in the configuration loaded in the "Gather configuration" section above.
                            // Deactivate the loading overlay since everything is done so far.
                            else {
                                $compile(svgNode.getSVGDocument())(scope);

                                window.svgJS = Snap(svgNode.getSVGDocument().getElementsByTagName("svg")[0]);

                                scope.loading = false;
                                document.getElementById('loadingOverlay').style.display = "none";
                            }
                        });                            
                    };
                }
            },
            restrict:"E",
            template: '<object ng-attr-data="{{presentationPath}}" onload="fireSVGLoaded(this)" ng-attr-width="{{screen.width}}" ng-attr-height="{{screen.height}}" id="SVG" type="image/svg+xml"></object>'
        };
    })
    .directive('presentator', function() {
        return {
            restrict:"E",
            templateUrl:"parts/presentator.html"
        };
    })
    .directive('presentorShow', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                var childScope = angular.element(document.getElementById("controller")).scope();

                if(event.which === 80 && childScope.presentationModeOn) {
                    var controller = childScope.svgController;
                    controller.presentatorShown = !controller.presentatorShown;

                    //event.preventDefault();

                    childScope.$apply();
                }
                
            });
        };
    });
;           
