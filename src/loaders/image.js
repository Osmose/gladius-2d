define(function(require) {
    function ImageLoader(url, loadSuccess, loadFailure) {
        var img = new Image();
        img.onload = function() {
            if (img.complete) {
                loadSuccess.call(null, img);
            } else {
                loadFailure.call(null, 'Failed to load image: ' + url);
            }
        };
        img.src = url;
    }

    return ImageLoader;
});