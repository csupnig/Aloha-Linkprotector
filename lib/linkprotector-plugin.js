/**
 * Created by Wuz on 02.12.2014.
 */
/* linkprotector-plugin.js is part of the Aloha Editor project http://aloha-editor.org
 *
 * Aloha Editor is a WYSIWYG HTML5 inline editing library and editor.
 * Copyright (c) 2010-2014 Gentics Software GmbH, Vienna, Austria.
 * Contributors http://aloha-editor.org/contribution.php
 * License http://aloha-editor.org/license.php
 */
/**
 * @name linkprotector
 * @namespace linkprotector plugin
 */
define([
    'jquery',
    'PubSub',
    'aloha/plugin',
    'aloha/core',
    'aloha/content-rules',
    'util/html',
    'util/dom',
    'aloha/ephemera'
], function (
    $,
    PubSub,
    Plugin,
    Aloha,
    ContentRules,
    Html,
    Dom,
    Ephemera
) {
    'use strict';

    /**
     * Name of this plugin
     */
    var pluginName = 'linkprotector';

    var configurations = {};

    /**
     * @param {Editable} editable
     */
    function protectLinks(editable) {
        if (!editable) {
            return;
        }
        var $obj = editable.obj;
        if (!$obj) {
            return;
        }
        var obj = $obj[0], i, j, selectionRange = Aloha.Selection.rangeObject, contentChanged = false;

        // check whether nesting of paragraphs inside the editable is allowed
        if (!Dom.allowsNesting(obj, $('<span></span>')[0])) {
            return;
        }

        // collect lists all links that need to be protected
        var nonBlockRanges = [];
        var current;
        $obj.find('a').each(function () {

            // start a new list for each anchor
            current = {
                objs: []
            };
            nonBlockRanges.push(current);


            // add the DOM element to the current list
            current.objs.push(this);
            $(this).attr("contenteditable", true);
            Ephemera.markAttr($(this)[0], 'contenteditable');
        });


        for (i = 0; i < nonBlockRanges.length; i++) {
            var range = nonBlockRanges[i];
            var indexStart = Dom.getIndexInParent(range.objs[0]);
            var indexEnd = Dom.getIndexInParent(range.objs[range.objs.length - 1]);
            var $p = $('<span class="ephemera" contenteditable="false"></span>');

            // correct the start of the selection range, if necessary
            if (selectionRange.startContainer === obj) {
                if (selectionRange.startOffset > indexStart && selectionRange.startOffset <= indexEnd) {
                    selectionRange.startContainer = $p[0];
                    selectionRange.startOffset -= indexStart;
                } else if (selectionRange.startOffset > indexEnd) {
                    selectionRange.startOffset -= (indexEnd - indexStart);
                }
            }
            // correct the end of the selection range, if necessary
            if (selectionRange.endContainer === obj) {
                if (selectionRange.endOffset > indexStart && selectionRange.endOffset <= indexEnd) {
                    selectionRange.endContainer = $p[0];
                    selectionRange.endOffset -= indexStart;
                } else if (selectionRange.endOffset > indexEnd) {
                    selectionRange.endOffset -= (indexEnd - indexStart);
                }
            }

            // insert the wrapper right before the old dom elements
            $(range.objs[0]).before($p);
            Ephemera.markWrapper($p[0]);
            // move all old dom elements into the paragraph
            for (j = 0; j < range.objs.length; j++) {
                $p[0].appendChild(range.objs[j]);
            }
            contentChanged = true;
        }

        // select the corrected selection, but only if we changed
        // something in the content and the editable is the active one
        if (contentChanged && editable.isActive) {
            selectionRange.select();
        }
    }


    /**
     * @type {Aloha.Plugin}
     */
    var linkprotectorPlugin = Plugin.create(pluginName, {
        /**
         * Default config: plugin active for all editables
         */
        config: [pluginName],

        /**
         * Initialize the plugin
         */
        init: function () {
            var plugin = this;

            PubSub.sub('aloha.editable.created', function (message) {
                var editable = message.editable;
                var config = plugin.getEditableConfig(editable.obj);
                var enabled = config
                    && ($.inArray(pluginName, config) > -1);
                configurations[editable.getId()] = !!enabled;
                if (enabled) {
                    protectLinks(editable);
                }
            });

            // autogenerate link protectors upon smart content change
            /*Aloha.bind('aloha-smart-content-changed', function (event, data) {
                if (configurations[data.editable.getId()]) {
                    protectLinks(data.editable);
                }
            });*/
        }
    });

    return linkprotectorPlugin;
});
