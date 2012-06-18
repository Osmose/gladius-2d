define(function(require) {
    function Graphic(img) {
        this.img = img;
    }

    Graphic.prototype = {
        render: function(ctx, x, y) {
            ctx.drawImage(this.img, x, y);
        }
    };

    return Graphic;
});