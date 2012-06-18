define(function(require) {
    var Component = require('base/component');
    var extend = require('common/extend');

    function g2d(service, options) {
        Component.call(this, '2d', service);

        options = options || {};
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.graphic = options.graphic || null;
    }
    g2d.prototype = Object.create(Component.prototype);
    g2d.prototype.constructor = g2d;

    extend(g2d.prototype, {
        onRender: function(event) {
            var data = event.data;
            this.graphic.render(data.ctx, this.x, this.y);
        },

        onEntitySpaceChanged: function(event) {
            var data = event.data;
            if (data.previous === null && data.current !== null && this.owner !== null) {
                this.provider.registerComponent(this.owner.id, this);
            }

            if (data.previous !== null && data.current === null && this.owner !== null) {
                this.provider.unregisterComponent(this.owner.id, this);
            }
        },

        onComponentOwnerChanged: function(event) {
            var data = event.data;
            if (data.previous === null && this.owner !== null) {
                this.provider.registerComponent(this.owner.id, this);
            }

            if (this.owner === null && data.previous !== null) {
                this.provider.unregisterComponent(data.previous.id, this);
            }
        },

        onEntityActivationChanged: function(event) {
            var active = event.data;
            if (active) {
                this.provider.registerComponent(this.owner.id, this);
            } else {
                this.provider.unregisterComponent(this.owner.id, this);
            }
        }
    });

    return g2d;
});