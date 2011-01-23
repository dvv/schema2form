//      index.js
//
//      Copyright 2010 dvv <dronnikov@gmail.com>
//
//      This program is free software; you can redistribute it and/or modify
//      it under the terms of the GNU General Public License as published by
//      the Free Software Foundation; either version 2 of the License, or
//      (at your option) any later version.
//
//      This program is distributed in the hope that it will be useful,
//      but WITHOUT ANY WARRANTY; without even the implied warranty of
//      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//      GNU General Public License for more details.
//
//      You should have received a copy of the GNU General Public License
//      along with this program; if not, write to the Free Software
//      Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
//      MA 02110-1301, USA.

/*
 * Given JSON-schema and data, render an HTML form
 */

// FIXME: IE fails to render deeper than 2 array levels
// FIXME: hardcoded id and some text
// TODO: use Modernizr object to make defaults
function obj2form(schema, data, path, entity, flavor){
	function putAttr(value, attr){
		return value ? attr + '="' + (value === true ? attr : value) + '" ' : '';
	}
	schema || (schema = {});
	// FIXME: way rude
	if (schema.readonly === true || typeof schema.readonly == 'object' && schema.readonly[flavor]) return;
	if (!path) path = 'data';
	var s = [];
	if (schema.type === 'object' || schema.$ref instanceof Object || schema.type === 'array') {
		s.push('<fieldset ' + putAttr(_.T(schema.description||'form'+entity), 'title') + '>');
		if (schema.title)
			s.push('<legend>' + _.T('form'+schema.title) + '</legend>');
		// object
		if (schema.type === 'object' || schema.$ref instanceof Object) {
			if (schema.$ref instanceof Object) {
				schema = schema.$ref;
			}
			// top level object ID
			var schema = schema.properties;
			for (var name in schema) if (schema.hasOwnProperty(name)) { var def = schema[name];
				s.push(obj2form(def, data && data[name], path ? path+'['+name+']' : name, entity, flavor));
			}
		// array: provide sort/add/delete
		} else {
			var def = schema.items[0] || schema.items;
			s.push('<ol class="array" rel="'+path+'">'); // TODO: apply dragsort by .array-item
			// fill array items, or just put an empty item
			var array = data || [undefined];
			for (var i = 0; i < array.length; ++i) {
				s.push('<li class="array-item">');
				s.push(obj2form(def, array[i], path+'[]', entity, flavor));
				// add/delete
				// TODO: configurable text
				s.push('<div class="array-action">');
				s.push('<a class="array-action" rel="clone" href="#">'+_.T('formArrayClone')+'</a>');
				s.push('<a class="array-action" rel="remove" href="#">'+_.T('formArrayRemove')+'</a>');
				s.push('<a class="array-action" rel="moveup" href="#">'+_.T('formArrayMoveUp')+'</a>');
				s.push('<a class="array-action" rel="movedown" href="#">'+_.T('formArrayMoveDown')+'</a>');
				s.push('</div>');
				s.push('</li>');
			}
			s.push('</ol>');
		}
		s.push('</fieldset>');
	} else {
		s.push('<div class="field">');
		var label = 'form'+entity+(path.replace('data','').replace(/\[(\w*)\]/g, function(hz, x){return x ? _.capitalize(x) : ''}));
		s.push('<label>' + _.T(label) + '</label>');
		var t, type = 'text';
		var pattern = schema.pattern;
		if ((t = schema.type) === 'number' || t === 'integer') {
			//type = 'number'; // N.B. so far type = 'number' sucks in chrome for linux!
			// N.B. we can't impose a stricter (no dots and exponent) pattern on integers, since 1.1e2 === 110
		} else if (t === 'date' || t === 'string' && schema.format === 'datetime') {
			// TODO: Date or String?!!!
			type = 'isodate';
			//data = Date.fromDB(data);
		//} else if (t === 'boolean') {
		//	type = 'checkbox';
		} else if (schema.format === 'email' || schema.format === 'url' || schema.format === 'password') {
			type = schema.format;
			if (type === 'password') data = undefined;
		}
		// lookup field?
		if (schema.format && schema.format.indexOf('@') >= 0 && path !== 'data[id]') {
			s.push('<div class="combo" id="' + path + '" rel="' + schema.format + '" ' +
				putAttr(data ? _.escapeHTML(data) : data, 'value') +
			'></div>');
		// enum?
		} else if (schema['enum']) {
			if (schema.format === 'tag') {
				//putAttr(schema.format, schema.format === 'tag' ? 'data-tags') +
			} else {
				s.push('<select type="' + type + '" data-type="' + type + '" name="' + path + '">');
				// TODO: lazy fetch from DB?
				var options = schema['enum'];
				//if (schema.$ref)
				s.push('<option></option>'); // null option
				// TODO: value of option?
				//for (var i in options) if (options.hasOwnProperty(i)) { var option = options[i];
				$.each(options, function(index, option){
					var value = option && option.id || option;
					var title = option && option.name || option;
					//s.push('<option value="' + i + '" ' + putAttr(data === i, 'selected') + '>' + option + '</option>');
					console.log('OPTION', data, value, title);
					s.push('<option ' + putAttr(data === value, 'selected') + '>' + title + '</option>');
				});
				s.push('</select>');
			}
		} else if (t === 'string' && (schema.format === 'html' || schema.format === 'js')) {
			// put textarea
			// TODO: required
			s.push('<textarea name="' + path + '" data-format="' + schema.format + '">');
			s.push(data ? _.escapeHTML(data) : data);
			s.push('</textarea>');
		} else if (t === 'boolean') {
			s.push('<select data-type="' + type + '" name="' + path + '">');
			s.push('<option value=""></option>'); // null option
			s.push('<option value="true"' + (data === true ? ' selected="selected"' : '') + '>' + _.T('yes') + '</option>');
			s.push('<option value="false"' + (data === false ? ' selected="selected"' : '') + '>' + _.T('no') + '</option>');
			s.push('</select>');
		} else {
			// put input
			//// date means datetime-local
			s.push('<input type="' + (type === 'date' ? 'datetime-local' : type) + '" data-type="' + type + '" name="' + path + '" ' +
			//s.push('<input type="' + (type === 'date' ? 'text' : type) + '" data-type="' + type + '" name="' + path + '" ' +
			//s.push('<input type="' + type + '" data-type="' + type + '" name="' + path + '" ' +
				putAttr(data && path === 'data[id]', 'readonly') +
				putAttr(schema.description, 'title') +
				putAttr(_.T(label + 'Placeholder'), 'placeholder') +
				//putAttr(schema.optional !== true, 'required') +
				putAttr(schema.minLength, 'minlength') +
				putAttr(schema.maxLength, 'maxlength') +
				putAttr(pattern, 'pattern') +
				putAttr(schema.minimum, 'min') +
				putAttr(schema.maximum, 'max') +
				// checkboxes are controlled via .checked, not value
				// dates also quirky
				//putAttr(data, type === 'checkbox' ? 'checked' : (type === 'date' ? 'data-value' : 'value')) +
				putAttr(data ? _.escapeHTML(data) : data, type === 'checkbox' ? 'checked' : 'value') +
			'/>');
		}
		s.push('</div>');
	}
	return s.join('');
}

/*
 * Power up dynamic form arrays
 *
 * To be called from $(document).ready(...)
 */
function initFormArrays(){
	$(document).delegate('form .array-action', 'click', function(e){
		e.preventDefault();
		var action = $(this).attr('rel');
		var p = $(this).parents('.array-item').first();
		var array = p.parents('.array').first();
		if (action === 'clone') {
			// clone the parent
			var c = p.clone(true); // N.B. we clone event handlers also
			p.after(c);
		} else if (action === 'remove') {
			// remove the parent
			if (p.siblings('.array-item').length) {
				p.remove();
			}
		} else if (action === 'moveup') {
			// move upper
			var c = p.prev('.array-item');
			if (c.length)
				c.before(p.detach());
		} else if (action === 'movedown') {
			// move lower
			var c = p.next('.array-item');
			if (c.length)
				c.after(p.detach());
		}
	});
}

/*
 * Power up dynamic tag suggests
 *
 * To be called from $(document).ready(...)
 */
function initTagSuggests(){
	//$('form input[type=text]').tagSuggest({tags: ['a', 'vv', 'bbb']});
	$('form input[type=text]').autocomplete(['a', 'vv', 'bbb'], {
		matchContains: true,
		minChars: 0,
		multiple: true,
		mustMatch: true,
		autoFill: true
	});
}

/*
 * Get the data object from the specified HTML form
 */
(function($){
	$.fn.serializeObject = function(options){
		options = $.extend({
			filterEmpty: false
		}, options || {});
		var o = {};
		var a = this.serializeArray();
		for (i = 0; i < a.length; i += 1) {
			if (a[i].value !== '' || !options.filterEmpty) {
				o = parseNestedParam(o, a[i].name, a[i].value);
			}
		}
		return o;
	};
	function parseValue(value) {
		value = unescape(value);
		if (value === "true") {
			return true;
		} else if (value === "false") {
			return false;
		} else {
			return value;
		}
	};
	function parseNestedParam(params, field_name, field_value) {
		var match, name, rest;

		if (field_name.match(/^[^\[]+$/)) {
			// basic value
			params[field_name] = parseValue(field_value);
		} else if (match = field_name.match(/^([^\[]+)\[\](.*)$/)) {
			// array
			name = match[1];
			rest = match[2];

			if(params[name] && !$.isArray(params[name])) { throw('400 Bad Request'); }

			if (rest) {
				// array is not at the end of the parameter string
				match = rest.match(/^\[([^\]]+)\](.*)$/);
				if(!match) { throw('400 Bad Request'); }

				if (params[name]) {
					if(params[name][params[name].length - 1][match[1]]) {
						params[name].push(parseNestedParam({}, match[1] + match[2], field_value));
					} else {
						$.extend(true, params[name][params[name].length - 1], parseNestedParam({}, match[1] + match[2], field_value));
					}
				} else {
					params[name] = [parseNestedParam({}, match[1] + match[2], field_value)];
				}
			} else {
				// array is at the end of the parameter string
				if (params[name]) {
					params[name].push(parseValue(field_value));
				} else {
					params[name] = [parseValue(field_value)];
				}
			}
		} else if (match = field_name.match(/^([^\[]+)\[([^\[]+)\](.*)$/)) {
			// hash
			name = match[1];
			rest = match[2] + match[3];

			if (params[name] && $.isArray(params[name])) { throw('400 Bad Request'); }

			if (params[name]) {
				$.extend(true, params[name], parseNestedParam(params[name], rest, field_value));
			} else {
				params[name] = parseNestedParam({}, rest, field_value);
			}
		}
		return params;
	};
})(jQuery);
