/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var CallbackStore = require('../utilities/CallbackStore');

var RENDER_SIZE = 2;

/**
 * A DOMElement is a renderable that can be added just like a "normal"
 * component to a node using `addComponent`.
 * Renderables send draw commands to the node they are attached to.
 * Those commands then get interpreted by the `DOMRenderer` in the Main thread
 * to build the actual DOM representation.
 *
 * @class DOMElement
 * @constructor
 *
 * @param {Node} node                   The entity to which the `DOMElement`
 *                                      renderable should be attached to.
 * @param {Object} options              Initial options used for instantiating
 *                                      the Node.
 * @param {Object} options.properties   CSS properties that should be added to
 *                                      the actual DOMElement on the initial draw.
 * @param {Object} options.attributes   Element attributes that should be added to
 *                                      the actual DOMElement.
 * @param {String} options.id           String to be applied as 'id' of the actual
 *                                      DOMElement.
 * @param {String} options.content      String to be applied as the content of the
 *                                      actual DOMElement.
 * @param {Boolean} options.cutout      Specifies the presence of a 'cutout' in the
 *                                      WebGL canvas over this element which allows
 *                                      for DOM and WebGL layering.  On by default.
 */
function DOMElement (node, options) {
    if (!node) throw new Error('DOMElement must be instantiated on a node');

    if (typeof options === 'string') {
        console.warn(
            'HTMLElement constructor signature changed!\n' +
            'Pass in an options object with {tagName: ' + options + '} instead.'
        );
        options = {
            tagName: options
        };
    }

    this._node = node;
    this._parent = null;
    this._children = [];

    this._requestingUpdate = false;
    this._renderSized = false;
    this._requestRenderSize = false;

    this._changeQueue = [];

    this._UIEvents = node.getUIEvents().slice(0);
    this._classes = [];
    this._requestingEventListeners = [];
    this._styles = {
        display: node.isShown(),
        opacity: node.getOpacity()
    };
    this._attributes = {};
    this._content = '';

    this._tagName = options && options.tagName ? options.tagName : 'div';
    this._id = node ? node.addComponent(this) : null;

    this._renderSize = [0, 0, 0];

    this._callbacks = new CallbackStore();

    
    var key;
    
    for (key in this.constructor.DEFAULT_STYLES) {
        this.setProperty(key, this.constructor.DEFAULT_STYLES[key]);
    }

    if (!options) return;

    var key;

    if (options.classes) {
        for (var i = 0; i < options.classes.length; i++)
            this.addClass(options.classes[i]);
    }

    if (options.attributes) {
        for (key in options.attributes)
            this.setAttribute(key, options.attributes[key]);
    }

    if (options.properties) {
        for (key in options.properties)
            this.setProperty(key, options.properties[key]);
    }

    if (options.id) this.setId(options.id);
    if (options.content) this.setContent(options.content);
    if (options.cutout === false) this.setCutoutState(options.cutout);
}

/**
 * Serializes the state of the DOMElement. This method will be invoked by
 * @{@link Node#getValue} in order to serialize the node and possibly entire
 * scene graph hierarchies.
 *
 * @method getValue
 *
 * @return {Object}     serialized component.
 */
DOMElement.prototype.getValue = function getValue () {
    return {
        classes: this._classes,
        styles: this._styles,
        attributes: this._attributes,
        content: this._content,
        id: this._attributes.id,
        tagName: this._tagName
    };
};

/**
 * Method to be invoked by the node as soon as an update occurs. This allows
 * the DOMElement renderable to dynamically react to state changes on the Node.
 *
 * This flushes the internal draw command queue by sending individual commands
 * to the node using `sendDrawCommand`.
 *
 * @method onUpdate
 */
DOMElement.prototype.onUpdate = function onUpdate () {
    var node = this._node;
    var queue = this._changeQueue;
    var len = queue.length;

    if (len && node) {
        node.sendDrawCommand('WITH');
        node.sendDrawCommand(node.getLocation());
        node.sendDrawCommand('DOM');

        while (len--) node.sendDrawCommand(queue.shift());
        if (this._requestRenderSize) {
            node.sendDrawCommand('DOM_RENDER_SIZE');
            node.sendDrawCommand(node.getLocation());
            this._requestRenderSize = false;
        }
 
    }

    this._requestingUpdate = false;
};

/**
 * Private method which sets the parent of the element in the DOM
 * hierarchy.
 *
 * @method _setParent
 * @protected
 *
 * @param {String} path of the parent
 */
DOMElement.prototype._setParent = function _setParent (path) {
    if (this._node) {
        var location = this._node.getLocation();
        if (location === path || location.indexOf(path) === -1)
            throw new Error('The given path isn\'t an ancestor');
        this._parent = path;
    } else throw new Error('_setParent called on an Element that isn\'t in the scene graph');
};

/**
 * Private method which adds a child of the element in the DOM
 * hierarchy.
 *
 * @method _addChild
 * @protected
 *
 * @param {String} path of the child
 */
DOMElement.prototype._addChild = function _addChild (path) {
    if (this._node) {
        var location = this._node.getLocation();
        if (path === location || path.indexOf(location) === -1)
            throw new Error('The given path isn\'t a descendent');
        if (this._children.indexOf(path) === -1) this._children.push(path);
        else throw new Error('The given path is already a child of this element');
    } else throw new Error('_addChild called on an Element that isn\'t in the scene graph');
};

/**
 * Private method which returns the path of the parent of this element
 *
 * @method _getParent
 * @protected
 */
DOMElement.prototype._getParent = function _getParent () {
    return this._parent;
};

/**
 * Private method which returns an array of paths of the children elements
 * of this element
 *
 * @method _getChildren
 * @protected
 */
DOMElement.prototype._getChildren = function _getChildren () {
    return this._children;
};

/**
 * Method to be invoked by the Node as soon as the node (or any of its
 * ancestors) is being mounted.
 *
 * @method onMount
 *
 * @param  {Node} node      Parent node to which the component should be added.
 * @param  {String} id      Path at which the component (or node) is being
 *                          attached. The path is being set on the actual
 *                          DOMElement as a `data-fa-path`-attribute.
 */
DOMElement.prototype.onMount = function onMount (node, id) {
    this._node = node;
    this._id = id;
    this._UIEvents = node.getUIEvents().slice(0);
    this.draw();
    this.setAttribute('data-fa-path', node.getLocation());
};

/**
 * Method to be invoked by the Node as soon as the node is being dismounted
 * either directly or by dismounting one of its ancestors).
 *
 * @method onDismount
 */
DOMElement.prototype.onDismount = function onDismount () {
    this.setProperty('display', 'none');
    this.setAttribute('data-fa-path', '');
    this._initialized = false;
};

/**
 * Method to be invoked by the node as soon as the DOMElement is being shown.
 * This results into the DOMElement setting the `display` property to `block`
 * and therefore visually showing the corresponding DOMElement (again).
 *
 * @method onShow
 */
DOMElement.prototype.onShow = function onShow () {
    this.setProperty('display', 'block');
};

/**
 * Method to be invoked by the node as soon as the DOMElement is being hidden.
 * This results into the DOMElement setting the `display` property to `none`
 * and therefore visually hiding the corresponding DOMElement (again).
 *
 * @method onHide
 */
DOMElement.prototype.onHide = function onHide () {
    this.setProperty('display', 'none');
};

/**
 * Enables or disables WebGL 'cutout' for this element, which affects
 * how the element is layered with WebGL objects in the scene.
 *
 * @method setCutoutState
 *
 * @param {Boolean} usesCutout  The presence of a WebGL 'cutout' for this element.
 */
DOMElement.prototype.setCutoutState = function setCutoutState (usesCutout) {
    this._changeQueue.push('GL_CUTOUT_STATE', usesCutout);

    if (this._initialized) this._requestUpdate();
};

/**
 * Method to be invoked by the node as soon as the transform matrix associated
 * with the node changes.
 * The DOMElement will react to transform changes by sending `CHANGE_TRANSFORM`
 * commands to the `DOMRenderer`.
 *
 * @method onTransformChange
 *
 * @param  {Float32Array} transform     The final transform matrix.
 */
DOMElement.prototype.onTransformChange = function onTransformChange (transform) {
    this._changeQueue.push('CHANGE_TRANSFORM');
    for (var i = 0, len = transform.length ; i < len ; i++)
        this._changeQueue.push(transform[i]);

    this.onUpdate();
};

/**
 * Method to be invoked by the node as soon as its computed size changes.
 *
 * @method onSizeChange
 * @chainable
 *
 * @param  {Float32Array} size      Absolute, pixel size.
 * @return {DOMElement} this
 */
DOMElement.prototype.onSizeChange = function onSizeChange (size) {
    var sizeMode = this._node.getSizeMode();
    var sizedX = sizeMode[0] !== RENDER_SIZE;
    var sizedY = sizeMode[1] !== RENDER_SIZE;
    if (this._initialized)
        this._changeQueue.push('CHANGE_SIZE',
            sizedX ? size[0] : sizedX,
            sizedY ? size[1] : sizedY);

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Method to be invoked by the node as soon as its opacity changes.
 *
 * @method onOpacityChange
 * @chainable
 *
 * @param  {Number} opacity      The new opacity, as a scalar from 0 to 1.
 * @return {DOMElement} this
 */
DOMElement.prototype.onOpacityChange = function onOpacityChange (opacity) {
    return this.setProperty('opacity', opacity);
};

/**
 * Method to be invoked by the node as soon as a new UIEvent is being added.
 * This results into an `ADD_EVENT_LISTENER` command being send.
 * 
 * @param  {String} UIEvent     UIEvent to be subscribed to (e.g. `click`).
 */
DOMElement.prototype.onAddUIEvent = function onAddUIEvent (UIEvent) {
    if (this._UIEvents.indexOf(UIEvent) === -1) {
        this._subscribe(UIEvent);
        this._UIEvents.push(UIEvent);
    } else if (this._inDraw) {
        this._subscribe(UIEvent);
    }
    return this;
};

/**
 * Appends an `ADD_EVENT_LISTENER` command to the command queue.
 *
 * @param  {String} UIEvent Event type (e.g. `click`)
 */
DOMElement.prototype._subscribe = function _subscribe (UIEvent) {
    if (this._initialized) {
        this._changeQueue.push('SUBSCRIBE', UIEvent, true);
    }
    if (!this._requestingUpdate) {
        this._requestUpdate();
    }
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Method to be invoked by the node as soon as the underlying size mode
 * changes. This results into the size being fetched from the node in
 * order to update the actual, rendered size.
 *
 * @method onSizeModeChange
 */
DOMElement.prototype.onSizeModeChange = function onSizeModeChange (x, y, z) {
    if (x === RENDER_SIZE || y === RENDER_SIZE || z === RENDER_SIZE) {
        this._renderSized = true;
        this._requestRenderSize = true;
    }
    this.onSizeChange(this._node.getSize());
};


DOMElement.prototype.getRenderSize = function getRenderSize () {
    return this._renderSize;
};

DOMElement.prototype._requestUpdate = function _requestUpdate () {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
};

/**
 * Initializes the DOMElement by sending the `INIT_DOM` command. This creates
 * or reallocates a new Element in the actual DOM hierarchy.
 *
 * @method init
 */
DOMElement.prototype.init = function init () {
    this._changeQueue.push('INIT_DOM', this._tagName);
    this._initialized = true;
    this.onTransformChange(this._node.getTransform());
    this.onSizeChange(this._node.getSize());
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Sets the id attribute of the DOMElement.
 *
 * @method setId
 * @chainable
 *
 * @param {String} id   New id to be set.
 */
DOMElement.prototype.setId = function setId (id) {
    this.setAttribute('id', id);
    return this;
};

/**
 * Adds a new class to the internal class list of the underlying Element in the
 * DOM.
 *
 * @method addClass
 * @chainable
 *
 * @param {String} value    New class name to be added.
 * @return {DOMElement} this
 */
DOMElement.prototype.addClass = function addClass (value) {
    if (this._classes.indexOf(value) < 0) {
        if (this._initialized) this._changeQueue.push('ADD_CLASS', value);
        this._classes.push(value);
        if (!this._requestingUpdate) this._requestUpdate();
        if (this._renderSized) this._requestRenderSize = true;
        return this;
    }

    if (this._inDraw) {
        if (this._initialized) this._changeQueue.push('ADD_CLASS', value);
        if (!this._requestingUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Removes a class from the DOMElement's classList.
 *
 * @method removeClass
 *
 * @param  {String} value       Class name to be removed.
 * @return {DOMElement} this
 */
DOMElement.prototype.removeClass = function removeClass (value) {
    var index = this._classes.indexOf(value);

    if (index < 0) return this;

    this._changeQueue.push('REMOVE_CLASS', value);

    this._classes.splice(index, 1);

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Sets an attribute of the DOMElement.
 *
 * @method setAttribute
 *
 * @param {String} name     Attribute key (e.g. `src`)
 * @param {String} value    Attribute value (e.g. `http://famo.us`)
 */
DOMElement.prototype.setAttribute = function setAttribute (name, value) {
    if (this._attributes[name] !== value || this._inDraw) {
        this._attributes[name] = value;
        if (this._initialized) this._changeQueue.push('CHANGE_ATTRIBUTE', name, value);
        if (!this._requestUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Sets a CSS property.
 *
 * @method setProperty
 * @chainable
 *
 * @param {String} name  Name of the CSS rule (e.g. `background-color`).
 * @param {String} value Value of CSS property (e.g. `red`).
 * @return {DOMElement} this
 */
DOMElement.prototype.setProperty = function setProperty (name, value) {
    if (this._styles[name] !== value || this._inDraw) {
        this._styles[name] = value;
        if (this._initialized) this._changeQueue.push('CHANGE_PROPERTY', name, value);
        if (!this._requestingUpdate) this._requestUpdate();
        if (this._renderSized) this._requestRenderSize = true;
    }
    return this;
};

/**
 * Sets the content of the DOMElement. This is using `innerHTML`, escaping user
 * generated content is therefore essential for security purposes.
 *
 * @method setContent
 *
 * @param {String} content     Content to be set using `.innerHTML = ...`
 */
DOMElement.prototype.setContent = function setContent (content) {
    if (this._content !== content || this._inDraw) {
        this._content = content;
        if (this._initialized) this._changeQueue.push('CHANGE_CONTENT', content);
        if (!this._requestingUpdate) this._requestUpdate();
        if (this._renderSized) this._requestRenderSize = true;
    }
    return this;
};

/**
 * Subscribes to a DOMElement using.
 *
 * @method on
 *
 * @param  {String} event       The event type (e.g. `click`).
 * @param  {Function} listener  Handler function for the specified event type
 *                              in which the payload event object will be
 *                              passed into.
 */
DOMElement.prototype.on = function on (event, listener) {
    return this._callbacks.on(event, listener);
};

/**
 * Function to be invoked by the Node whenever an UIEvent is being received.
 * There are two different ways to subscribe for those events:
 *
 * 1. By overriding the onReceive method (and possibly using `switch` in order
 *     to differentiate between the different event types).
 * 2. By using @{@link DOMElement#on} and using the built-in
 *     @{@linkCallbackStore}.
 *
 * @method onReceive
 *
 * @param  {String} event   Event type (e.g. `click`).
 * @param  {Object} payload Event object.
 */
DOMElement.prototype.onReceive = function onReceive (event, payload) {
    if (event === 'resize') {
        this._renderSize[0] = payload.val[0];
        this._renderSize[1] = payload.val[1];
        if (!this._requestingUpdate) this._requestUpdate();
    }
    this._callbacks.trigger(event, payload);
};

/**
 * The draw function is being used in order to allow mutating the DOMElement
 * before actually mounting the corresponding node.
 *
 * @method draw
 * @private
 */
DOMElement.prototype.draw = function draw () {
    var key;
    var i;
    var len;

    this._inDraw = true;

    this.init();

    for (i = 0, len = this._classes.length ; i < len ; i++)
        this.addClass(this._classes[i]);

    if (this._content) this.setContent(this._content);

    for (key in this._styles)
        if (this._styles[key])
            this.setProperty(key, this._styles[key]);

    for (key in this._attributes)
        if (this._attributes[key])
            this.setAttribute(key, this._attributes[key]);

    for (i = 0, len = this._UIEvents.length ; i < len ; i++)
        this.onAddUIEvent(this._UIEvents[i]);

    this._inDraw = false;
};

DOMElement.DEFAULT_STYLES = {
    'position': 'absolute',
    '-webkit-transform-origin': '0% 0%',
    'transform-origin': '0% 0%',
    '-webkit-backface-visibility': 'visible',
    'backface-visibility': 'visible',
    '-webkit-transform-style': 'preserve-3d',
    'transform-style': 'preserve-3d; /* performance *',
    '-webkit-tap-highlight-color': 'transparent',
    'pointer-events': 'auto',
    'z-index': '1'
};

module.exports = DOMElement;

