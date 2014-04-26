Polymer('padlock-view', {
    //* Options the header element is going to use to adjust ist appearance
    headerOptions: {
        show: false,
        leftIconShape: "",
        rightIconShape: "",
        showFilter: false
    },
    //* Title text that is going to be displayed in header element
    titleText: "",
    //* Duration of the in/out animations
    animationDuration: 400,
    //* Animation timing function for the in/out animations
    animationEasing: "ease",
    leftHeaderButton: function() {},
    rightHeaderButton: function() {},
    attached: function() {
        require(["padlock/platform"], function(platform) {
            // We have to register a listener for the animationend event manually
            // sind it doesn't seem to work declaratively (bug in Polymer?)
            var eventName = platform.getAnimationEndEventName();
            this.addEventListener(eventName, this.animationEnd.bind(this));
        }.bind(this));
    },
    /**
     * Returns the element that the animation should be applied to. Sometimes
     * it is necessary to use something different than the view element itself.
     * This is mainly being used for working around a bug in iOS that causes
     * problems with _-webkit-overflow-scrolling: touch_ on animated elements.
     */
    getAnimationElement: function() {
        return this;
    },
    /**
     * Starts the in/out animation for this view
     * @param  {String}   direction The animation direction. Can be _in_ or _out_.
     * @param  {String}   animation The name of the animation to be used. If not provided
     *                              the default in/out animation will be used.
     * @param  {Integer}  duration  Duration to use for the animation
     * @param  {Function} callback  This will be called after the animation has finished
     */
    startAnimation: function(direction, animation, duration, callback) {
        // The padlock/platform module was already requested in the _attached_ method
        // so we're assuming it has already been loaded.
        var platform = require("padlock/platform"),
            prefix = platform.getVendorPrefix().css,
            // We use fill styles mainly to prevent the animated 'flashing' before an in animation starts
            // or after an out animation ends. The reason we don't simply use a fill style of 'both' is
            // that we don't want the elements to be in a separate composition layer after the're done animating.
            fillStyle = direction == "in" ? "backwards" : "forwards";

        duration = duration || this.animationDuration;
        this.currAnimation = animation;
        this.currDirection = direction;
        this.animationCallback = callback;

        // Apparently firefox doesn't want the prefix when directly changing styles
        prefix = prefix == "-moz-" ? "" : prefix;

        // Apply the animation the appropriate element
        this.getAnimationElement().style[prefix + "animation"] = [
            animation,
            duration + "ms",
            this.animationEasing,
            "0ms",
            fillStyle
        ].join(" ");
        
        // If we are not using an animation or the animation duration is 0,
        // then the animationend event will not be fired. So we have to fire the
        // _animation-end_ and call the callback function directly.
        if (!animation || !this.animationDuration) {
            this.fire("animation-end", {direction: direction});
            if (this.animationCallback) {
                this.animationCallback();
                this.animationCallback = null;
            }
        }
    },
    //* Calls the animationend callback and fires the _animation-end_ event
    animationEnd: function(event) {
        if (event.animationName == this.currAnimation) {
            if (this.animationCallback) {
                this.animationCallback();
                this.animationCallback = null;
            }
            this.fire("animation-end", {direction: this.currDirection});
        }
    },
    //* Show the view
    show: function(animation, duration, callback) {
        // We apply the animation before adding the node to the rendering
        // tree in order to avoid 'flashes'
        this.startAnimation("in", animation, duration, callback);
        // Trigger a style recalculation to make sure the style changes
        // are applied before rendering the element
        this.offsetLeft;
        // Show the element
        this.style.display = "";
    },
    //* Hides the view
    hide: function(animation, duration, callback) {
        // We have to wait until the out animation is done before
        // we can set _display: none_.
        this.startAnimation("out", animation, duration, function() {
            this.style.display = "none";
            if (callback) {
                callback();
            }
        }.bind(this));
    }
});