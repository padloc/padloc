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
            // sind it doesn't seem to work declaratively
            var startEventName = platform.getAnimationStartEventName(),
                endEventName = platform.getAnimationEndEventName();
            this.addEventListener(startEventName, this.animationStart.bind(this));
            this.addEventListener(endEventName, this.animationEnd.bind(this));
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
    startAnimation: function(opts) {
        opts = opts || {};
        // The padlock/platform module was already requested in the _attached_ method
        // so we're assuming it has already been loaded.
        var platform = require("padlock/platform"),
            prefix = platform.getVendorPrefix().css,
            direction = this.currDirection = opts.direction,
            duration = opts.duration || this.animationDuration,
            animation = this.currAnimation = opts.animation,
            // We use fill styles mainly to prevent the animated 'flashing' before an in animation starts
            // or after an out animation ends. The reason we don't simply use a fill style of 'both' is
            // that we don't want the elements to be in a separate composition layer after the're done animating.
            fillStyle = direction == "in" ? "backwards" : "forwards";
            
        this.animationStartCallback = opts.startCallback;
        this.animationEndCallback = opts.endCallback;

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
            this.animationStart({animationName: animation});
            this.animationEnd({animationName: animation});
        }
    },
    //* Calls the animationstart callback and fires the _animation-start event
    animationStart: function(event) {
        if (event.animationName == this.currAnimation) {
            if (this.animationStartCallback) {
                this.animationStartCallback();
                this.animationStartCallback = null;
            }
            this.fire("animation-start", {direction: this.currDirection});
        }
    },
    //* Calls the animationend callback and fires the _animation-end_ event
    animationEnd: function(event) {
        if (event.animationName == this.currAnimation) {
            if (this.animationEndCallback) {
                this.animationEndCallback();
                this.animationEndCallback = null;
            }
            this.fire("animation-end", {direction: this.currDirection});
        }
    },
    //* Show the view
    show: function(opts) {
        opts = opts || {};
        opts.direction = "in";
        // We apply the animation before adding the node to the rendering
        // tree in order to avoid 'flashes'
        this.startAnimation(opts);
        // Trigger a style recalculation to make sure the style changes
        // are applied before rendering the element
        this.offsetLeft;
        // Show the element
        this.style.display = "";
    },
    //* Hides the view
    hide: function(opts) {
        opts = opts || {};
        opts.direction = "out";
        var endCallback = opts.endCallback;
        opts.endCallback = function() {
            this.style.display = "none";
            if (endCallback) {
                endCallback();
            }
        }.bind(this);

        // We have to wait until the out animation is done before
        // we can set _display: none_.
        this.startAnimation(opts);
    },
    //* Closes any dialogs first, if no dialogs are open, fires `back` event
    back: function() {
        var dialogs = this.shadowRoot.querySelectorAll("padlock-dialog"),
            dialogClosed = false;

        Array.prototype.forEach.call(dialogs, function(dialog) {
            if (dialog.open) {
                dialog.open = false;
                dialogClosed = true;
            }
        });

        if (!dialogClosed) {
            this.fire("back");
        }
    }
});