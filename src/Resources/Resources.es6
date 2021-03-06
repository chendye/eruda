import Tool from '../DevTools/Tool.es6'
import util from '../lib/util'
import config from '../lib/config.es6'

export default class Resources extends Tool
{
    constructor()
    {
        super();

        util.evalCss(require('./Resources.scss'));

        this.name = 'resources';
        this._localStoreData = [];
        this._hideErudaSetting = false;
        this._sessionStoreData = [];
        this._cookieData = [];
        this._scriptData = [];
        this._stylesheetData = [];
        this._imageData = [];
        this._tpl = require('./Resources.hbs');
    }
    init($el, parent)
    {
        super.init($el);

        this._parent = parent;

        this.refresh();
        this._bindEvent();
        this._initConfig();
    }
    refresh()
    {
        return this.refreshLocalStorage()
                   .refreshSessionStorage()
                   .refreshCookie()
                   .refreshScript()
                   .refreshStylesheet()
                   .refreshImage()._render();
    }
    refreshScript()
    {
        var scriptData = [];

        util.$('script').each(function ()
        {
            var src = this.src;

            if (src !== '') scriptData.push(src);
        });

        scriptData = util.unique(scriptData);

        this._scriptData = scriptData;

        return this;
    }
    refreshStylesheet()
    {
        var stylesheetData = [];

        util.$('link').each(function ()
        {
            if (this.rel !== 'stylesheet') return;

            stylesheetData.push(this.href);
        });

        stylesheetData = util.unique(stylesheetData);

        this._stylesheetData = stylesheetData;

        return this;
    }
    refreshLocalStorage()
    {
        this._refreshStorage('local');

        return this;
    }
    refreshSessionStorage()
    {
        this._refreshStorage('session');

        return this;
    }
    _refreshStorage(type)
    {
        var storeData = [];

        // Mobile safari is not able to loop through localStorage directly.
        var store = JSON.parse(JSON.stringify(window[type + 'Storage']));

        util.each(store, (val, key) =>
        {
            if (this._hideErudaSetting && util.startWith(key, 'eruda')) return;

            storeData.push({
                key: key,
                val: sliceStr(val, 200)
            });
        });

        this['_' + type + 'StoreData'] = storeData;
    }
    refreshCookie()
    {
        var cookieData = [];

        var cookie = document.cookie;
        if (util.trim(cookie) !== '')
        {
            util.each(document.cookie.split(';'), function (val)
            {
                val = val.split('=');
                cookieData.push({
                    key: util.trim(val[0]),
                    val: decodeURIComponent(val[1])
                });
            });
        }

        this._cookieData = cookieData;

        return this;
    }
    refreshImage()
    {
        var imageData = [];

        util.$('img').each(function ()
        {
            var $this = util.$(this),
                src = $this.attr('src');

            if ($this.data('exclude') === 'true') return;

            imageData.push(src);
        });

        imageData = util.unique(imageData);

        this._imageData = imageData;

        return this;
    }
    show()
    {
        super.show();

        return this.refresh();
    }
    _bindEvent()
    {
        var self = this,
            $el = this._$el,
            parent = this._parent;

        $el.on('click', '.refresh-local-storage', () => this.refreshLocalStorage()._render())
           .on('click', '.refresh-session-storage', () => this.refreshSessionStorage()._render())
           .on('click', '.refresh-cookie', () => this.refreshCookie()._render())
           .on('click', '.refresh-script', () => this.refreshScript()._render())
           .on('click', '.refresh-image', () => this.refreshImage()._render())
           .on('click', '.delete-storage', function ()
           {
               var $this = util.$(this),
                   key = $this.data('key'),
                   type = $this.data('type');

               if (type === 'local')
               {
                   localStorage.removeItem(key);
                   self.refreshLocalStorage()._render();
               } else
               {
                   sessionStorage.removeItem(key);
                   self.refreshSessionStorage()._render();
               }
           })
           .on('click', '.delete-cookie', function ()
           {
               var key = util.$(this).data('key');

               delCookie(key);
               self.refreshCookie()._render();
           })
           .on('click', '.eruda-clear-storage', function ()
           {
               var type = util.$(this).data('type');

               if (type === 'local')
               {
                   util.each(self._localStoreData, val => localStorage.removeItem(val.key));
                   self.refreshLocalStorage()._render();
               } else
               {
                   util.each(self._sessionStoreData, val => sessionStorage.removeItem(val.key));
                   self.refreshSessionStorage()._render();
               }
           })
           .on('click', '.eruda-clear-cookie', () =>
           {
               util.each(this._cookieData, val => delCookie(val.key));
               this.refreshCookie()._render();
           })
           .on('click', '.eruda-storage-val', function ()
           {
               var $this = util.$(this),
                   key = $this.data('key'),
                   type = $this.data('type');

               var val = type === 'local' ? localStorage.getItem(key) : sessionStorage.getItem(key);

               try {
                   showSources('json', JSON.parse(val));
               } catch(e)
               {
                   showSources('raw', val);
               }
           })
           .on('click', '.img-link', function ()
           {
               var src = util.$(this).attr('src');

               showSources('img', src);
           })
           .on('click', '.css-link', linkFactory('css'))
           .on('click', '.js-link', linkFactory('js'));

        util.orientation.on('change', () => this._render());

        function showSources(type, data)
        {
            var sources = parent.get('sources');
            if (!sources) return;

            sources.set(type, data);

            parent.showTool('sources');
        }

        function linkFactory(type)
        {
            return function (e)
            {
                var url = util.$(this).attr('href');

                if (!util.isCrossOrig(url))
                {
                    e.preventDefault();

                    return util.get(url, (err, data) =>
                    {
                        if (err) return;

                        showSources(type, data);
                    });
                }
            };
        }
    }
    _initConfig()
    {
        var cfg = this.config = config.create('eruda-resources');

        cfg.set(util.defaults(cfg.get(), {
            hideErudaSetting: true
        }));

        if (cfg.get('hideErudaSetting')) this._hideErudaSetting = true;

        cfg.on('change', (key, val) =>
        {
            switch (key)
            {
                case 'hideErudaSetting': this._hideErudaSetting = val; return;
            }
        });

        var settings = this._parent.get('settings');
        settings.text('Resources')
                .switch(cfg, 'hideErudaSetting', 'Hide Eruda Setting')
                .separator();
    }
    _render()
    {
        var cookieData = this._cookieData,
            scriptData = this._scriptData,
            stylesheetData = this._stylesheetData,
            imageData = this._imageData;

        this._renderHtml(this._tpl({
            localStoreData: this._localStoreData,
            sessionStoreData: this._sessionStoreData,
            cookieData: cookieData,
            cookieState: getState('cookie', cookieData.length),
            scriptData: scriptData,
            scriptState: getState('script', scriptData.length),
            stylesheetData: stylesheetData,
            stylesheetState: getState('stylesheet', stylesheetData.length),
            imageData: imageData,
            imageState: getState('image', imageData.length)
        }));

        if (this._imageData.length === 0) return;

        setTimeout(() =>
        {
            var $li = this._$el.find('.eruda-image-list li');

            $li.css({height: $li.get(0).offsetWidth});
        }, 150);
    }
    _renderHtml(html)
    {
        if (html === this._lastHtml) return;
        this._lastHtml = html;
        this._$el.html(html);
    }
}

function getState(type, len)
{
    if (len === 0) return '';

    var warn = 0, danger = 0;

    switch (type)
    {
        case 'cookie': warn = 30; danger = 60; break;
        case 'script': warn = 5; danger = 10; break;
        case 'stylesheet': warn = 4; danger = 8; break;
        case 'image': warn = 50; danger = 100; break;
    }

    if (len >= danger) return 'eruda-danger';
    if (len >= warn) return 'eruda-warn';

    return 'eruda-ok';
}

var {hostname, pathname} = window.location;

function delCookie(key)
{
    util.cookie.remove(key);

    let hostNames = hostname.split('.'),
        pathNames = pathname.split('/'),
        domain = '',
        pathLen = pathNames.length,
        path;

    for (let i = hostNames.length - 1; i >= 0; i--)
    {
        let hostName = hostNames[i];
        if (hostName === '') continue;
        domain = (domain === '') ? hostName : hostName + '.' + domain ;

        path = '/';
        util.cookie.remove(key, {domain, path});
        for (let j = 0; j < pathLen; j++)
        {
            let pathName = pathNames[j];
            if (pathName === '') continue;
            path += pathName;
            util.cookie.remove(key, {domain, path});
        }
    }
}

var sliceStr = (str, len) => str.length < len ? str : str.slice(0, len) + '...';