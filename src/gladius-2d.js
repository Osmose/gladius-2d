define(function(require) {
	var Extension = require('base/extension');

	return new Extension('gladius-2d', {
		services: {
            renderer: {
                service: require('src/services/renderer'),
                components: {
                    g2d: require('src/components/g2d')
                },
                resources: {}
            }
        },
		components: {},
		resources: {
            Graphic: require('src/resources/graphic')
        }
	})
});