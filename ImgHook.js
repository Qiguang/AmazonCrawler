javascript: function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    document.body.appendChild(link); /*link.click(); */
    window.open(link, '_blank');
}
if (location.host.search('amazon') != -1) {
    nodes = document.getElementsByClassName('image item selected');
    if (nodes.length) {
        for (var i = 0; i < nodes.length; ++i) {
            imgs = nodes[i].getElementsByTagName('img');
            if (imgs.length) {
                for (var j = 0; j < imgs.length; ++j) {
                    if (imgs[j].hasAttribute('data-old-hires')) {
                        link = imgs[j].getAttribute('data-old-hires');
                    }
                }
            }
        }
    }
} else if (location.host.search('taobao') != -1 || location.host.search('tmall') != -1) {
    img = document.getElementById('J_ImgBooth');
    if (!img) img = document.getElementById('ks-content-ks-component1515').firstElementChild;
    if (img && img.hasAttribute('src')) {
        link = img.getAttribute('src').replace(RegExp('(jpg)_.+'), '$1');
    }
} else if (location.host.search('aliexpress') != -1) {
    nodes = document.getElementsByClassName('ui-image-viewer-image-frame');
    if (nodes.length) {
        for (var i = 0; i < nodes.length; ++i) {
            imgs = nodes[i].getElementsByTagName('img');
            if (imgs.length) {
                for (var j = 0; j < imgs.length; ++j) {
                    link = imgs[j].getAttribute('src');
                }
            }
        }
    }
} else if (location.host.search('ebay') != -1) {
    if (!Object.prototype.watch) {
        Object.defineProperty(Object.prototype, "watch", {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function(prop, handler) {
                var oldval = this[prop],
                    newval = oldval,
                    getter = function() {
                        return newval;
                    },
                    setter = function(val) {
                        oldval = newval;
                        return newval = handler.call(this, prop, oldval, val);
                    };
                if (delete this[prop]) {
                    Object.defineProperty(this, prop, {
                        get: getter,
                        set: setter,
                        enumerable: true,
                        configurable: true
                    });
                }
            }
        });
    }
    if (!Object.prototype.unwatch) {
        Object.defineProperty(Object.prototype, "unwatch", {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function(prop) {
                var val = this[prop];
                delete this[prop];
                this[prop] = val;
            }
        });
    }
    var img = document.getElementById('zoom_main_img');
    if (img) {
        img.style.watch('display', function() {
            link = img.src;
            img.style.unwatch('display')
        });
    }
} else if (location.host.search('1688') != -1) {
    var activeImg = document.getElementsByClassName('active');
    if (activeImg.length) {
        link = JSON.parse(activeImg[0].getAttribute('data-imgs')).original;
    }

}
downloadURI(link, link);
