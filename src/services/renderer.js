define(function(require) {
    var Service = require('base/service');
    var extend = require('common/extend');
    var Event = require('core/event');

    function Renderer(scheduler, options) {
        Service.call(this, scheduler, {
            render: {
                tags: ['@render', 'graphics'],
                dependsOn: []
            }
        });

        options = options || {};
        this.canvas = options.canvas || null;
        this.ctx = (this.canvas !== null ? this.canvas.getContext('2d') : null);
    }
    Renderer.prototype = Object.create(Service.prototype);
    Renderer.prototype.constructor = Renderer;

    extend(Renderer.prototype, {
        render: function() {
            if (this.canvas === null) return;

            var renderEvent = new Event('Render', {
                ctx: this.ctx
            });

            this.ctx.save();
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.forEachComponent(function(component) {
                while(component.handleQueuedEvent()) {
                    // Pass
                }
                renderEvent(component);
            });

            this.ctx.restore();
        },

        forEachComponent: function(callback, type) {
            var components = this._registeredComponents;
            for (var componentType in components) {
                if (type !== undefined && componentType !== type) return;
                for (var entityId in components[componentType]) {
                    callback.call(this, components[componentType][entityId]);
                }
            }
        },

        // Loaders have nowhere else to live. :(
        loaders: {
           image: require('src/loaders/image')
        }
    });

    return Renderer;
});