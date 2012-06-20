define(function(require) {
    var Component = require('base/component');
    var extend = require('common/extend');

    function Sprite(service, options) {
        Component.call(this, '2d', service, ['Transform']);

        options = options || {};
        this.graphic = options.graphic || null;
    }
    Sprite.prototype = Object.create(Component.prototype);
    Sprite.prototype.constructor = Sprite;

    extend(Sprite.prototype, {
        onRender: function(event) {
            var data = event.data;
            var transform = this.owner.findComponent('Transform');
            var pos = transform.position;

            this.graphic.render(data.ctx, pos[0], pos[1]);
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

    return Sprite;
});