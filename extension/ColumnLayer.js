define(["dojo/_base/declare", "esri/layers/GraphicsLayer", "esri/geometry/Point", "esri/SpatialReference",
    "esri/graphic", "esri/symbols/PictureMarkerSymbol","esri/geometry/webMercatorUtils","dojo/_base/lang"
], function(declare, GraphicsLayer, Point, SpatialReference,Graphic, PictureMarkerSymbol,webMercatorUtils,lang) {

    var Column = function (data, colorset, max, width, height, linecolor, selectedlinecolor) {
        this.columns = [];
        this.data = data;
        this.linecolor=linecolor||"rgba(229, 205, 205, 0.78)";
        this.selectedlinecolor=selectedlinecolor||"#0F66E9"; // format suchas  #FFFFFF rgba(229, 205, 205, 0.78) or color name
        this.config = colorset; //{'name1':"#F7464A",'name2':'#E2EAE9','name3':'#02EAF9','name4':'#D4CCC5','name5':'#D4CC00'}
        this.canvas = document.createElement('canvas');
        this.width = width;
        this.height= height;
        this.canvas.width = width;
        this.canvas.height= height;
        this.ctx = this.canvas.getContext('2d');
        this.max = max;
        if(max==0){
            console.log("The maximum value must not be equal to zero.");
            return;
        }
        var configArray = Object.keys(this.config);
        this.columnLenght = configArray.length;
        this.spacing = this.width/this.columnLenght;
        this.half = this.width / 2;
        var j = 0;
        for (var d in data) {
            if(this.config.hasOwnProperty(d)){
                var width = this.spacing;
                var height = this.data[d]/this.max*this.height;
                var x = width * j;
                var y = this.height - height;
                this.columns.push({
                    name: d,
                    width:width,
                    height:height,
                    x: x,
                    y: y
                });
                j++;
            }
        }
        console.log(this.columns);
        this.draw(-1);
    }
    Column.prototype.getAreaIndex = function(dx, dy) {
        var index = parseFloat(Math.floor((dx + this.half) / this.spacing));
        if(index > -1 && index < this.columnLenght){
            return index;
        }
        return -1;
    }
    Column.prototype.getImageData = function() {
        return this.canvas.toDataURL("image/png");
    }
    Column.prototype.antialiasing = function(){
        if (window.devicePixelRatio) {
            this.canvas.style.width = this.width + "px";
            this.canvas.style.height = this.height + "px";
            this.canvas.width = this.width * window.devicePixelRatio;
            this.canvas.height = this.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }
    Column.prototype.showShadow=function(){
        var ctx = this.ctx;
        ctx.shadowColor = "RGBA(127,127,127,1)";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = this.height;
        ctx.shadowBlur = 0;
    },
    Column.prototype.draw = function() {
        var ctx = this.ctx;
        //this.antialiasing(this.width,this.height);
        ctx.clearRect(0, 0, this.width, this.height);
        for (var i = 0; i < this.columns.length; i++) {
            ctx.beginPath();
            ctx.moveTo(this.columns[i].x, this.columns[i].y);
            ctx.fillStyle = this.config[this.columns[i].name];
            ctx.fillRect(this.columns[i].x, this.columns[i].y, this.columns[i].width, this.columns[i].height);
            ctx.fill();
        }
    }
    Column.prototype.drawselected = function(i) {
        var ctx = this.ctx;
        this.draw();
        ctx.beginPath();
        ctx.moveTo(this.columns[i].x, this.columns[i].y);
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.selectedlinecolor;
        ctx.rect(this.columns[i].x, this.columns[i].y, this.columns[i].width, this.columns[i].height);
        ctx.closePath();
        ctx.stroke();
    }

    return declare([GraphicsLayer], {
        constructor: function(options) {
            // width  Number?
            // 必选：柱状图宽度
            // height  Number?
            // 必选：柱状图高度
            // colors  Object
            // 必选：柱状图颜色值类似于 {'name1':"#F7464A",'name2':'#E2EAE9','name3':'#02EAF9','name4':'#D4CCC5','name5':'#D4CC00'}
            // linecolor String?
            // 可选：边框颜色，默认 'rgba(229, 205, 205, 0.78)'.
            // selectedlinecolor String?
            // 可选：选中项边框颜色，默认值是 '"#0F66E9"'.
            // data Object[]
            // 必选：对象数组。对象要求具有x、y的坐标属性和其他基本属性。
            // spatialReference Object
            // 可选：图层的地理坐标系，默认值是 Web Mercator坐标系
            this.colorConfig = options.colors;
            this.width = options.width;
            this.height = options.height;
            this.linecolor=options.linecolor||"rgba(129, 205, 205, 0.78)";
            this.selectedlinecolor=options.selectedlinecolor||"#ff0000";
            this.spatialReference=options.spatialReference|| new SpatialReference({wkid:102100});
            this.data=options.data||[];
        },
        _setMap: function(map, surface){
            if(this.data){
                this.data.forEach(lang.hitch(this,function(d){
                    this.add(d);
                }));
            }
            var div = this.inherited(arguments);
            return div;
        },
        add: function(p) {
            if (p.haschart) {
                this.inherited(arguments);
                this.onGraphicAdd(arguments);
                return;
            }
            this.addColumn(p);
        },
        //{x: 11547228.141733509,y:4641746.633916269,spatialReference:new SpatialReference({wkid:102100}),data:{'name1':30,'name2':40,'name3':50,'name4':60,'name5':70}};
        addColumn: function(e) {
            //this.data.push(e);
            if (e.x && e.y && e.attributes) {
                var x,y,center;
                // 判断坐标是否在合理范围内
                if(e.x>-180&&e.x<180&&e.y>-90&&e.y<90){
                    var normalizedVal = webMercatorUtils.lngLatToXY(e.x, e.y, true);
                    x=normalizedVal[0];
                    y=normalizedVal[1]
                }
                else
                {
                    x=e.x;y=e.y;
                }
                center = new Point(e.x,e.y, this.spatialReference);
                var column = new Column(e.attributes,this.colorConfig,250,this.width,this.height,center);
                var imagedata = column.getImageData();
                var json = {
                    url: imagedata,
                    "width": column.width*0.75,
                    "height": column.height*0.75
                };
                var sym = new PictureMarkerSymbol(json)
                var graphic = new Graphic(center, sym,e.attributes);
                graphic.haschart = true;
                graphic.column = column;
                graphic.selectedindex = -1;
                //  this.inherited(graphic);
                this.add(graphic);
            }
        },
        onGraphicAdd: function() {},
        _getMouseOffset:function(e){
            var mappt = e.mapPoint;
            var graphic = e.graphic;
            var _map = this.getMap();
            var offsetPoint = _map.toScreen(mappt);
            var originPoint = _map.toScreen(graphic.geometry);
            var dx = offsetPoint.x-originPoint.x;
            var dy = offsetPoint.y-originPoint.y;
            return {
                dx:dx,dy:dy
            }
        },
        _updatesymbol:function(e,unselected) {
            if (e.graphic.haschart) {
                var graphic = e.graphic;
                var offset = this._getMouseOffset(e);
                var column = e.graphic.column;
                var index = column.getAreaIndex(offset.dx, offset.dy);
                if (index > -1&&e.graphic.selectedindex != index) {
                    e.graphic.selectedindex = index;
                    var c=column.columns[index];
                    if(c!=undefined&&c.hasOwnProperty("name")){
                        var sname=c.name;
                        e.slecetedata={};
                        e.slecetedata[name]=column.data[sname];
                        e.columndata=column.data;
                        column.drawselected(index);
                        var imagedata = column.getImageData();
                        var json = {
                            "url": imagedata,
                            "width": column.height*0.75,
                            "height": column.height*0.75
                        };
                        var sym = new PictureMarkerSymbol(json)
                        graphic.setSymbol(sym)
                    }
                }
            }
        },
        onClick: function(e) {
            this._updatesymbol(e);
            this._extenteventarg(e);
        },
        onMouseMove: function(e) {
            this._updatesymbol(e);
            this._extenteventarg(e);
        },
        onMouseOver: function(e) {
            this._updatesymbol(e);
            this._extenteventarg(e);
        },
        onMouseDown: function(e) {
            this._extenteventarg(e);
        },
        onMouseUp: function(e) {
            this._extenteventarg(e);
        },
        _extenteventarg:function(e){
            var column = e.graphic.column;
            if(e.graphic.selectedindex>=0){
                var c = column.columns[e.graphic.selectedindex];
                if(c.hasOwnProperty("name")){
                    var sname=c.name;
                    e.slecetedata={};
                    e.slecetedata[sname]=column.data[sname];
                    e.columndata=column.data;
                }
            }
        },
        onMouseOut: function(e) {
            if (e.graphic.haschart) {
                var graphic = e.graphic;
                var column = e.graphic.column;
                column.draw();
                var imagedata = column.getImageData();
                var json = {
                    url: imagedata,
                    "width": column.height*0.75,
                    "height": column.height*0.75
                };
                var sym = new PictureMarkerSymbol(json)
                graphic.setSymbol(sym)
                e.graphic.selectedindex=-1;
            }
            this._extenteventarg(e);
        }

    })
});
