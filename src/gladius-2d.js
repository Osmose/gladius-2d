define(function(require) {
	var Extension = require('base/extension');

	return new Extension('gladius-2d', {
		services: {
            renderer: {
                service: require('src/services/renderer'),
                components: {
                    Sprite: require('src/components/sprite')
                },
                resources: {}
            }
        },
		components: {},
		resources: {
            Graphic: require('src/resources/graphic')
        }
	});
});