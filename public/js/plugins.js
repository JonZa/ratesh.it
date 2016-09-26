function foo(bar, fly) {
	var paranoid = 0;
	if (!window.console || (fly && !paranoid)) {
		return false;
	} else if (bar === undefined || bar === null) {
		bar = 'o_O';
	}
	var time = new Date().toUTCString().split(' ')[4];
	if (typeof bar ==='object') {
		console.log('[' + time + '] object:');
		console.dir(bar)
	} else {
		console.log('[' + time + '] ' + bar);
	}
}
/**
 * TinySort is a small script that sorts HTML elements. It sorts by text- or attribute value, or by that of one of it's children.
 * @summary A nodeElement sorting script.
 * @version 2.3.0
 * @license MIT
 * @author Ron Valstar <ron@ronvalstar.nl>
 * @copyright Ron Valstar <ron@ronvalstar.nl>
 * @namespace tinysort
 */
(function (root,tinysort) {
	'use strict';

	if (typeof define==='function'&&define.amd) {
		define('tinysort',singleton);
	} else {
		root.tinysort = tinysort;
	}
	function singleton(){
		return tinysort;
	}
}(this,(function() {
	'use strict';

	var fls = !1
		,undef
		,nll = null
		,win = window
		,doc = win.document
		,parsefloat = parseFloat
		,regexLastNr = /(-?\d+\.?\d*)\s*$/g		// regex for testing strings ending on numbers
		,regexLastNrNoDash = /(\d+\.?\d*)\s*$/g	// regex for testing strings ending on numbers ignoring dashes
		,plugins = []
		,numCriteria = 0
		,criteriumIndex = 0
		,defaults = {				// default settings

			selector: nll			// CSS selector to select the element to sort to

			,order: 'asc'			// order: asc, desc or rand

			,attr: nll				// order by attribute value
			,data: nll				// use the data attribute for sorting
			,useVal: fls			// use element value instead of text

			,place: 'org'			// place ordered elements at position: start, end, org (original position), first, last
			,returns: fls			// return all elements or only the sorted ones (true/false)

			,cases: fls				// a case sensitive sort orders [aB,aa,ab,bb]

			,natural: fls			// use natural sort order

			,forceStrings:fls		// if false the string '2' will sort with the value 2, not the string '2'

			,ignoreDashes:fls		// ignores dashes when looking for numerals

			,sortFunction: nll		// override the default sort function

			,useFlex:fls
			,emptyEnd:fls
		}
	;

	/**
	 * TinySort is a small and simple script that will sort any nodeElment by it's text- or attribute value, or by that of one of it's children.
	 * @memberof tinysort
	 * @public
	 * @param {NodeList|HTMLElement[]|String} nodeList The nodelist or array of elements to be sorted. If a string is passed it should be a valid CSS selector.
	 * @param {Object} [options] A list of options.
	 * @param {String} [options.selector] A CSS selector to select the element to sort to.
	 * @param {String} [options.order='asc'] The order of the sorting method. Possible values are 'asc', 'desc' and 'rand'.
	 * @param {String} [options.attr=null] Order by attribute value (ie title, href, class)
	 * @param {String} [options.data=null] Use the data attribute for sorting.
	 * @param {String} [options.place='org'] Determines the placement of the ordered elements in respect to the unordered elements. Possible values 'start', 'end', 'first', 'last' or 'org'.
	 * @param {Boolean} [options.useVal=false] Use element value instead of text.
	 * @param {Boolean} [options.cases=false] A case sensitive sort (orders [aB,aa,ab,bb])
	 * @param {Boolean} [options.natural=false] Use natural sort order.
	 * @param {Boolean} [options.forceStrings=false] If false the string '2' will sort with the value 2, not the string '2'.
	 * @param {Boolean} [options.ignoreDashes=false] Ignores dashes when looking for numerals.
	 * @param {Function} [options.sortFunction=null] Override the default sort function. The parameters are of a type {elementObject}.
	 * @param {Boolean} [options.useFlex=true] If one parent and display flex, ordering is done by CSS (instead of DOM)
	 * @param {Boolean} [options.emptyEnd=true] Sort empty values to the end instead of the start
	 * @returns {HTMLElement[]}
	 */
	function tinysort(nodeList,options){
		if (isString(nodeList)) nodeList = doc.querySelectorAll(nodeList);
		if (nodeList.length===0) {
			console.warn('No elements to sort');
		}

		var fragment = doc.createDocumentFragment()
			/** both sorted and unsorted elements
			 * @type {elementObject[]} */
			,elmObjsAll = []
			/** sorted elements
			 * @type {elementObject[]} */
			,elmObjsSorted = []
			/** unsorted elements
			 * @type {elementObject[]} */
			,elmObjsUnsorted = []
			/** sorted elements before sort
			 * @type {elementObject[]} */
			,elmObjsSortedInitial
			/** @type {criteriumIndex[]} */
			,criteria = []
			/** @type {HTMLElement} */
			,parentNode
			,isSameParent = true
			,firstParent = nodeList.length&&nodeList[0].parentNode
			,isFragment = firstParent.rootNode!==document
			,isFlex = nodeList.length&&(options===undef||options.useFlex!==false)&&!isFragment&&getComputedStyle(firstParent,null).display.indexOf('flex')!==-1
		;

		initCriteria.apply(nll,Array.prototype.slice.call(arguments,1));
		initSortList();
		sort();
		applyToDOM();

		/**
		 * Create criteria list
		 */
		function initCriteria(){
			if (arguments.length===0) {
				addCriterium({}); // have at least one criterium
			} else {
				loop(arguments,function(param){
					addCriterium(isString(param)?{selector:param}:param);
				});
			}
			numCriteria = criteria.length;
		}

		/**
		 * A criterium is a combination of the selector, the options and the default options
		 * @typedef {Object} criterium
		 * @property {String} selector - a valid CSS selector
		 * @property {String} order - order: asc, desc or rand
		 * @property {String} attr - order by attribute value
		 * @property {String} data - use the data attribute for sorting
		 * @property {Boolean} useVal - use element value instead of text
		 * @property {String} place - place ordered elements at position: start, end, org (original position), first
		 * @property {Boolean} returns - return all elements or only the sorted ones (true/false)
		 * @property {Boolean} cases - a case sensitive sort orders [aB,aa,ab,bb]
		 * @property {Boolean} natural - use natural sort order
		 * @property {Boolean} forceStrings - if false the string '2' will sort with the value 2, not the string '2'
		 * @property {Boolean} ignoreDashes - ignores dashes when looking for numerals
		 * @property {Function} sortFunction - override the default sort function
		 * @property {boolean} hasSelector - options has a selector
		 * @property {boolean} hasFilter - options has a filter
		 * @property {boolean} hasAttr - options has an attribute selector
		 * @property {boolean} hasData - options has a data selector
		 * @property {number} sortReturnNumber - the sort function return number determined by options.order
		 */

		/**
		 * Adds a criterium
		 * @memberof tinysort
		 * @private
		 * @param {Object} [options]
		 */
		function addCriterium(options){
			var hasSelector = !!options.selector
				,hasFilter = hasSelector&&options.selector[0]===':'
				,allOptions = extend(options||{},defaults)
			;
			criteria.push(extend({
				// has find, attr or data
				hasSelector: hasSelector
				,hasAttr: !(allOptions.attr===nll||allOptions.attr==='')
				,hasData: allOptions.data!==nll
				// filter
				,hasFilter: hasFilter
				,sortReturnNumber: allOptions.order==='asc'?1:-1
			},allOptions));
		}

		/**
		 * The element object.
		 * @typedef {Object} elementObject
		 * @property {HTMLElement} elm - The element
		 * @property {number} pos - original position
		 * @property {number} posn - original position on the partial list
		 */

		/**
		 * Creates an elementObject and adds to lists.
		 * Also checks if has one or more parents.
		 * @memberof tinysort
		 * @private
		 */
		function initSortList(){
			loop(nodeList,function(elm,i){
				if (!parentNode) parentNode = elm.parentNode;
				else if (parentNode!==elm.parentNode) isSameParent = false;
				var criterium = criteria[0]
					,hasFilter = criterium.hasFilter
					,selector = criterium.selector
					,isPartial = !selector||(hasFilter&&elm.matchesSelector(selector))||(selector&&elm.querySelector(selector))
					,listPartial = isPartial?elmObjsSorted:elmObjsUnsorted
					,elementObject = {
						elm: elm
						,pos: i
						,posn: listPartial.length
					}
				;
				elmObjsAll.push(elementObject);
				listPartial.push(elementObject);
			});
			elmObjsSortedInitial = elmObjsSorted.slice(0);
		}

		/**
		 * Sorts the sortList
		 */
		function sort(){
			elmObjsSorted.sort(sortFunction);
		}

		/**
		 * Compare strings using natural sort order
		 * http://web.archive.org/web/20130826203933/http://my.opera.com/GreyWyvern/blog/show.dml/1671288
		 */
		function naturalCompare(a, b, chunkify) {
			var aa = chunkify(a.toString())
				,bb = chunkify(b.toString());
			for (var x = 0; aa[x] && bb[x]; x++) {
				if (aa[x]!==bb[x]) {
					var c = Number(aa[x])
						,d = Number(bb[x]);
					if (c == aa[x] && d == bb[x]) {
						return c - d;
					} else return aa[x]>bb[x]?1:-1;
				}
			}
			return aa.length - bb.length;
		}

		/**
		 * Split a string into an array by type: numeral or string
		 * @memberof tinysort
		 * @private
		 * @param {string} t
		 * @returns {Array}
		 */
		function chunkify(t) {
			var tz = [], x = 0, y = -1, n = 0, i, j;
			while (i = (j = t.charAt(x++)).charCodeAt(0)) {
				var m = (i == 46 || (i >=48 && i <= 57));
				if (m !== n) {
					tz[++y] = '';
					n = m;
				}
				tz[y] += j;
			}
			return tz;
		}

		/**
		 * Sort all the things
		 * @memberof tinysort
		 * @private
		 * @param {elementObject} a
		 * @param {elementObject} b
		 * @returns {number}
		 */
		function sortFunction(a,b){
			var sortReturnNumber = 0;
			if (criteriumIndex!==0) criteriumIndex = 0;
			while (sortReturnNumber===0&&criteriumIndex<numCriteria) {
				/** @type {criterium} */
				var criterium = criteria[criteriumIndex]
					,regexLast = criterium.ignoreDashes?regexLastNrNoDash:regexLastNr;
				//
				loop(plugins,function(plugin){
					var pluginPrepare = plugin.prepare;
					if (pluginPrepare) pluginPrepare(criterium);
				});
				//
				if (criterium.sortFunction) { // custom sort
					sortReturnNumber = criterium.sortFunction(a,b);
				} else if (criterium.order=='rand') { // random sort
					sortReturnNumber = Math.random()<0.5?1:-1;
				} else { // regular sort
					var isNumeric = fls
						// prepare sort elements
						,valueA = getSortBy(a,criterium)
						,valueB = getSortBy(b,criterium)
						,noA = valueA===''||valueA===undef
						,noB = valueB===''||valueB===undef
					;
					if (valueA===valueB) {
						sortReturnNumber = 0;
					} else if (criterium.emptyEnd&&(noA||noB)) {
						sortReturnNumber = noA&&noB?0:noA?1:-1;
					} else {
						if (!criterium.forceStrings) {
							// cast to float if both strings are numeral (or end numeral)
							var  valuesA = isString(valueA)?valueA&&valueA.match(regexLast):fls// todo: isString superfluous because getSortBy returns string|undefined
								,valuesB = isString(valueB)?valueB&&valueB.match(regexLast):fls
							;
							if (valuesA&&valuesB) {
								var  previousA = valueA.substr(0,valueA.length-valuesA[0].length)
									,previousB = valueB.substr(0,valueB.length-valuesB[0].length);
								if (previousA==previousB) {
									isNumeric = !fls;
									valueA = parsefloat(valuesA[0]);
									valueB = parsefloat(valuesB[0]);
								}
							}
						}
						if (valueA===undef||valueB===undef) {
							sortReturnNumber = 0;
						} else {
							// todo: check here
							if (!criterium.natural||(!isNaN(valueA)&&!isNaN(valueB))) {
								sortReturnNumber = valueA<valueB?-1:(valueA>valueB?1:0);
							} else {
								sortReturnNumber = naturalCompare(valueA, valueB, chunkify);
							}
						}
					}
				}
				loop(plugins,function(o){
					var pluginSort = o.sort;
					if (pluginSort) sortReturnNumber = pluginSort(criterium,isNumeric,valueA,valueB,sortReturnNumber);
				});
				sortReturnNumber *= criterium.sortReturnNumber; // lastly assign asc/desc
				if (sortReturnNumber===0) criteriumIndex++;
			}
			if (sortReturnNumber===0) sortReturnNumber = a.pos>b.pos?1:-1;
			return sortReturnNumber;
		}

		/**
		 * Applies the sorted list to the DOM
		 * @memberof tinysort
		 * @private
		 */
		function applyToDOM(){
			var hasSortedAll = elmObjsSorted.length===elmObjsAll.length;
			if (isSameParent&&hasSortedAll) {
				if (isFlex) {
					elmObjsSorted.forEach(function(elmObj,i){
						elmObj.elm.style.order = i;
					});
				} else {
					if (parentNode) parentNode.appendChild(sortedIntoFragment());
					else console.warn('parentNode has been removed');
				}
			} else {
				var criterium = criteria[0]
					,place = criterium.place
					,placeOrg = place==='org'
					,placeStart = place==='start'
					,placeEnd = place==='end'
					,placeFirst = place==='first'
					,placeLast = place==='last'
				;
				if (placeOrg) {
					elmObjsSorted.forEach(addGhost);
					elmObjsSorted.forEach(function(elmObj,i) {
						replaceGhost(elmObjsSortedInitial[i],elmObj.elm);
					});
				} else if (placeStart||placeEnd) {
					var startElmObj = elmObjsSortedInitial[placeStart?0:elmObjsSortedInitial.length-1]
						,startParent = startElmObj&&startElmObj.elm.parentNode
						,startElm = startParent&&(placeStart&&startParent.firstChild||startParent.lastChild);
					if (startElm) {
						if (startElm!==startElmObj.elm) startElmObj = {elm:startElm};
						addGhost(startElmObj);
						placeEnd&&startParent.appendChild(startElmObj.ghost);
						replaceGhost(startElmObj,sortedIntoFragment());
					}
				} else if (placeFirst||placeLast) {
					var firstElmObj = elmObjsSortedInitial[placeFirst?0:elmObjsSortedInitial.length-1];
					replaceGhost(addGhost(firstElmObj),sortedIntoFragment());
				}
			}
		}

		/**
		 * Adds all sorted elements to the document fragment and returns it.
		 * @memberof tinysort
		 * @private
		 * @returns {DocumentFragment}
		 */
		function sortedIntoFragment(){
			elmObjsSorted.forEach(function(elmObj){
				fragment.appendChild(elmObj.elm);
			});
			return fragment;
		}

		/**
		 * Adds a temporary element before an element before reordering.
		 * @memberof tinysort
		 * @private
		 * @param {elementObject} elmObj
		 * @returns {elementObject}
		 */
		function addGhost(elmObj){
			var element = elmObj.elm
				,ghost = doc.createElement('div')
			;
			elmObj.ghost = ghost;
			element.parentNode.insertBefore(ghost,element);
			return elmObj;
		}

		/**
		 * Inserts an element before a ghost element and removes the ghost.
		 * @memberof tinysort
		 * @private
		 * @param {elementObject} elmObjGhost
		 * @param {HTMLElement} elm
		 */
		function replaceGhost(elmObjGhost,elm){
			var ghost = elmObjGhost.ghost
				,ghostParent = ghost.parentNode;
			ghostParent.insertBefore(elm,ghost);
			ghostParent.removeChild(ghost);
			delete elmObjGhost.ghost;
		}

		/**
		 * Get the string/number to be sorted by checking the elementObject with the criterium.
		 * @memberof tinysort
		 * @private
		 * @param {elementObject} elementObject
		 * @param {criterium} criterium
		 * @returns {String}
		 * @todo memoize
		 */
		function getSortBy(elementObject,criterium){
			var sortBy
				,element = elementObject.elm;
			// element
			if (criterium.selector) {
				if (criterium.hasFilter) {
					if (!element.matchesSelector(criterium.selector)) element = nll;
				} else {
					element = element.querySelector(criterium.selector);
				}
			}
			// value
			if (criterium.hasAttr) sortBy = element.getAttribute(criterium.attr);
			else if (criterium.useVal) sortBy = element.value||element.getAttribute('value');
			else if (criterium.hasData) sortBy = element.getAttribute('data-'+criterium.data);
			else if (element) sortBy = element.textContent;
			// strings should be ordered in lowercase (unless specified)
			if (isString(sortBy)) {
				if (!criterium.cases) sortBy = sortBy.toLowerCase();
				sortBy = sortBy.replace(/\s+/g,' '); // spaces/newlines
			}
			return sortBy;
		}

		/*function memoize(fnc) {
			var oCache = {}
				, sKeySuffix = 0;
			return function () {
				var sKey = sKeySuffix + JSON.stringify(arguments); // todo: circular dependency on Nodes
				return (sKey in oCache)?oCache[sKey]:oCache[sKey] = fnc.apply(fnc,arguments);
			};
		}*/

		/**
		 * Test if an object is a string
		 * @memberOf tinysort
		 * @method
		 * @private
		 * @param o
		 * @returns {boolean}
		 */
		function isString(o){
			return typeof o==='string';
		}

		return elmObjsSorted.map(function(o) {
			return o.elm;
		});
	}

	/**
	 * Traverse an array, or array-like object
	 * @memberOf tinysort
	 * @method
	 * @private
	 * @param {Array} array The object or array
	 * @param {Function} func Callback function with the parameters value and key.
	 */
	function loop(array,func){
		var l = array.length
			,i = l
			,j;
		while (i--) {
			j = l-i-1;
			func(array[j],j);
		}
	}

	/**
	 * Extend an object
	 * @memberOf tinysort
	 * @method
	 * @private
	 * @param {Object} obj Subject.
	 * @param {Object} fns Property object.
	 * @param {boolean} [overwrite=false]  Overwrite properties.
	 * @returns {Object} Subject.
	 */
	function extend(obj,fns,overwrite){
		for (var s in fns) {
			if (overwrite||obj[s]===undef) {
				obj[s] = fns[s];
			}
		}
		return obj;
	}

	function plugin(prepare,sort,sortBy){
		plugins.push({prepare:prepare,sort:sort,sortBy:sortBy});
	}

	// matchesSelector shim
	win.Element&&(function(ElementPrototype) {
		ElementPrototype.matchesSelector = ElementPrototype.matchesSelector
		||ElementPrototype.mozMatchesSelector
		||ElementPrototype.msMatchesSelector
		||ElementPrototype.oMatchesSelector
		||ElementPrototype.webkitMatchesSelector
		||function (selector) {
			var that = this, nodes = (that.parentNode || that.document).querySelectorAll(selector), i = -1;
			//jscs:disable requireCurlyBraces
			while (nodes[++i] && nodes[i] != that);
			//jscs:enable requireCurlyBraces
			return !!nodes[i];
		};
	})(Element.prototype);

	// extend the plugin to expose stuff
	extend(plugin,{
		loop: loop
	});

	return extend(tinysort,{
		plugin: plugin
		,defaults: defaults
	});
})()));
/**
 * jQuery plugin wrapper for TinySort
 * Does not use the first argument in tinysort.js since that is handled internally by the jQuery selector.
 * Sub-selections (option.selector) do not use the jQuery selector syntax but regular CSS3 selector syntax.
 * @summary jQuery plugin wrapper for TinySort
 * @version 2.3.0
 * @requires tinysort
 * @license MIT/GPL
 * @author Ron Valstar (http://www.sjeiti.com/)
 * @copyright Ron Valstar <ron@ronvalstar.nl>
 */
(function (factory) {
	'use strict';
	if (typeof define==='function'&&define.amd) {
		define(['jquery','tinysort'],factory);
	} else if (jQuery && !jQuery.fn.tsort) {
		factory(jQuery,tinysort);
	}
}(function ($,tinysort) {
	'use strict';
	$.tinysort = { defaults: tinysort.defaults	};
	$.fn.extend({
		tinysort: function() {
			var aArg = Array.prototype.slice.call(arguments)
				,aSorted,iSorted;
			aArg.unshift(this);
			aSorted = tinysort.apply(null,aArg);
			iSorted = aSorted.length;
			for (var i=0,l=this.length;i<l;i++) {
				if (i<iSorted) this[i] = aSorted[i];
				else delete this[i];
			}
			this.length = iSorted;
			return this;
		}
	});
	$.fn.tsort = $.fn.tinysort;
}));
/*
	http://instafeedjs.com/
	steven schobert
*/
(function(){var e;e=function(){function e(e,t){var n,r;this.options={target:"instafeed",get:"popular",resolution:"thumbnail",sortBy:"none",links:!0,mock:!1,useHttp:!1};if(typeof e=="object")for(n in e)r=e[n],this.options[n]=r;this.context=t!=null?t:this,this.unique=this._genKey()}return e.prototype.hasNext=function(){return typeof this.context.nextUrl=="string"&&this.context.nextUrl.length>0},e.prototype.next=function(){return this.hasNext()?this.run(this.context.nextUrl):!1},e.prototype.run=function(t){var n,r,i;if(typeof this.options.clientId!="string"&&typeof this.options.accessToken!="string")throw new Error("Missing clientId or accessToken.");if(typeof this.options.accessToken!="string"&&typeof this.options.clientId!="string")throw new Error("Missing clientId or accessToken.");return this.options.before!=null&&typeof this.options.before=="function"&&this.options.before.call(this),typeof document!="undefined"&&document!==null&&(i=document.createElement("script"),i.id="instafeed-fetcher",i.src=t||this._buildUrl(),n=document.getElementsByTagName("head"),n[0].appendChild(i),r="instafeedCache"+this.unique,window[r]=new e(this.options,this),window[r].unique=this.unique),!0},e.prototype.parse=function(e){var t,n,r,i,s,o,u,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T,N,C,k,L,A,O,M,_,D;if(typeof e!="object"){if(this.options.error!=null&&typeof this.options.error=="function")return this.options.error.call(this,"Invalid JSON data"),!1;throw new Error("Invalid JSON response")}if(e.meta.code!==200){if(this.options.error!=null&&typeof this.options.error=="function")return this.options.error.call(this,e.meta.error_message),!1;throw new Error("Error from Instagram: "+e.meta.error_message)}if(e.data.length===0){if(this.options.error!=null&&typeof this.options.error=="function")return this.options.error.call(this,"No images were returned from Instagram"),!1;throw new Error("No images were returned from Instagram")}this.options.success!=null&&typeof this.options.success=="function"&&this.options.success.call(this,e),this.context.nextUrl="",e.pagination!=null&&(this.context.nextUrl=e.pagination.next_url);if(this.options.sortBy!=="none"){this.options.sortBy==="random"?M=["","random"]:M=this.options.sortBy.split("-"),O=M[0]==="least"?!0:!1;switch(M[1]){case"random":e.data.sort(function(){return.5-Math.random()});break;case"recent":e.data=this._sortBy(e.data,"created_time",O);break;case"liked":e.data=this._sortBy(e.data,"likes.count",O);break;case"commented":e.data=this._sortBy(e.data,"comments.count",O);break;default:throw new Error("Invalid option for sortBy: '"+this.options.sortBy+"'.")}}if(typeof document!="undefined"&&document!==null&&this.options.mock===!1){m=e.data,A=parseInt(this.options.limit,10),this.options.limit!=null&&m.length>A&&(m=m.slice(0,A)),u=document.createDocumentFragment(),this.options.filter!=null&&typeof this.options.filter=="function"&&(m=this._filter(m,this.options.filter));if(this.options.template!=null&&typeof this.options.template=="string"){f="",d="",w="",D=document.createElement("div");for(c=0,N=m.length;c<N;c++){h=m[c],p=h.images[this.options.resolution];if(typeof p!="object")throw o="No image found for resolution: "+this.options.resolution+".",new Error(o);E=p.width,y=p.height,b="square",E>y&&(b="landscape"),E<y&&(b="portrait"),v=p.url,l=window.location.protocol.indexOf("http")>=0,l&&!this.options.useHttp&&(v=v.replace(/https?:\/\//,"//")),d=this._makeTemplate(this.options.template,{model:h,id:h.id,link:h.link,type:h.type,image:v,width:E,height:y,orientation:b,caption:this._getObjectProperty(h,"caption.text"),likes:h.likes.count,comments:h.comments.count,location:this._getObjectProperty(h,"location.name")}),f+=d}D.innerHTML=f,i=[],r=0,n=D.childNodes.length;while(r<n)i.push(D.childNodes[r]),r+=1;for(x=0,C=i.length;x<C;x++)L=i[x],u.appendChild(L)}else for(T=0,k=m.length;T<k;T++){h=m[T],g=document.createElement("img"),p=h.images[this.options.resolution];if(typeof p!="object")throw o="No image found for resolution: "+this.options.resolution+".",new Error(o);v=p.url,l=window.location.protocol.indexOf("http")>=0,l&&!this.options.useHttp&&(v=v.replace(/https?:\/\//,"//")),g.src=v,this.options.links===!0?(t=document.createElement("a"),t.href=h.link,t.appendChild(g),u.appendChild(t)):u.appendChild(g)}_=this.options.target,typeof _=="string"&&(_=document.getElementById(_));if(_==null)throw o='No element with id="'+this.options.target+'" on page.',new Error(o);_.appendChild(u),a=document.getElementsByTagName("head")[0],a.removeChild(document.getElementById("instafeed-fetcher")),S="instafeedCache"+this.unique,window[S]=void 0;try{delete window[S]}catch(P){s=P}}return this.options.after!=null&&typeof this.options.after=="function"&&this.options.after.call(this),!0},e.prototype._buildUrl=function(){var e,t,n;e="https://api.instagram.com/v1";switch(this.options.get){case"popular":t="media/popular";break;case"tagged":if(!this.options.tagName)throw new Error("No tag name specified. Use the 'tagName' option.");t="tags/"+this.options.tagName+"/media/recent";break;case"location":if(!this.options.locationId)throw new Error("No location specified. Use the 'locationId' option.");t="locations/"+this.options.locationId+"/media/recent";break;case"user":if(!this.options.userId)throw new Error("No user specified. Use the 'userId' option.");t="users/"+this.options.userId+"/media/recent";break;default:throw new Error("Invalid option for get: '"+this.options.get+"'.")}return n=e+"/"+t,this.options.accessToken!=null?n+="?access_token="+this.options.accessToken:n+="?client_id="+this.options.clientId,this.options.limit!=null&&(n+="&count="+this.options.limit),n+="&callback=instafeedCache"+this.unique+".parse",n},e.prototype._genKey=function(){var e;return e=function(){return((1+Math.random())*65536|0).toString(16).substring(1)},""+e()+e()+e()+e()},e.prototype._makeTemplate=function(e,t){var n,r,i,s,o;r=/(?:\{{2})([\w\[\]\.]+)(?:\}{2})/,n=e;while(r.test(n))s=n.match(r)[1],o=(i=this._getObjectProperty(t,s))!=null?i:"",n=n.replace(r,function(){return""+o});return n},e.prototype._getObjectProperty=function(e,t){var n,r;t=t.replace(/\[(\w+)\]/g,".$1"),r=t.split(".");while(r.length){n=r.shift();if(!(e!=null&&n in e))return null;e=e[n]}return e},e.prototype._sortBy=function(e,t,n){var r;return r=function(e,r){var i,s;return i=this._getObjectProperty(e,t),s=this._getObjectProperty(r,t),n?i>s?1:-1:i<s?1:-1},e.sort(r.bind(this)),e},e.prototype._filter=function(e,t){var n,r,i,s,o;n=[],r=function(e){if(t(e))return n.push(e)};for(i=0,o=e.length;i<o;i++)s=e[i],r(s);return n},e}(),function(e,t){return typeof define=="function"&&define.amd?define([],t):typeof module=="object"&&module.exports?module.exports=t():e.Instafeed=t()}(this,function(){return e})}).call(this);
/**
* jquery-match-height master by @liabru
* http://brm.io/jquery-match-height/
* License: MIT
*/

;(function(factory) { // eslint-disable-line no-extra-semi
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Global
        factory(jQuery);
    }
})(function($) {
    /*
    *  internal
    */

    var _previousResizeWidth = -1,
        _updateTimeout = -1;

    /*
    *  _parse
    *  value parse utility function
    */

    var _parse = function(value) {
        // parse value and convert NaN to 0
        return parseFloat(value) || 0;
    };

    /*
    *  _rows
    *  utility function returns array of jQuery selections representing each row
    *  (as displayed after float wrapping applied by browser)
    */

    var _rows = function(elements) {
        var tolerance = 1,
            $elements = $(elements),
            lastTop = null,
            rows = [];

        // group elements by their top position
        $elements.each(function(){
            var $that = $(this),
                top = $that.offset().top - _parse($that.css('margin-top')),
                lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

            if (lastRow === null) {
                // first item on the row, so just push it
                rows.push($that);
            } else {
                // if the row top is the same, add to the row group
                if (Math.floor(Math.abs(lastTop - top)) <= tolerance) {
                    rows[rows.length - 1] = lastRow.add($that);
                } else {
                    // otherwise start a new row group
                    rows.push($that);
                }
            }

            // keep track of the last row top
            lastTop = top;
        });

        return rows;
    };

    /*
    *  _parseOptions
    *  handle plugin options
    */

    var _parseOptions = function(options) {
        var opts = {
            byRow: true,
            property: 'height',
            target: null,
            remove: false
        };

        if (typeof options === 'object') {
            return $.extend(opts, options);
        }

        if (typeof options === 'boolean') {
            opts.byRow = options;
        } else if (options === 'remove') {
            opts.remove = true;
        }

        return opts;
    };

    /*
    *  matchHeight
    *  plugin definition
    */

    var matchHeight = $.fn.matchHeight = function(options) {
        var opts = _parseOptions(options);

        // handle remove
        if (opts.remove) {
            var that = this;

            // remove fixed height from all selected elements
            this.css(opts.property, '');

            // remove selected elements from all groups
            $.each(matchHeight._groups, function(key, group) {
                group.elements = group.elements.not(that);
            });

            // TODO: cleanup empty groups

            return this;
        }

        if (this.length <= 1 && !opts.target) {
            return this;
        }

        // keep track of this group so we can re-apply later on load and resize events
        matchHeight._groups.push({
            elements: this,
            options: opts
        });

        // match each element's height to the tallest element in the selection
        matchHeight._apply(this, opts);

        return this;
    };

    /*
    *  plugin global options
    */

    matchHeight.version = 'master';
    matchHeight._groups = [];
    matchHeight._throttle = 80;
    matchHeight._maintainScroll = false;
    matchHeight._beforeUpdate = null;
    matchHeight._afterUpdate = null;
    matchHeight._rows = _rows;
    matchHeight._parse = _parse;
    matchHeight._parseOptions = _parseOptions;

    /*
    *  matchHeight._apply
    *  apply matchHeight to given elements
    */

    matchHeight._apply = function(elements, options) {
        var opts = _parseOptions(options),
            $elements = $(elements),
            rows = [$elements];

        // take note of scroll position
        var scrollTop = $(window).scrollTop(),
            htmlHeight = $('html').outerHeight(true);

        // get hidden parents
        var $hiddenParents = $elements.parents().filter(':hidden');

        // cache the original inline style
        $hiddenParents.each(function() {
            var $that = $(this);
            $that.data('style-cache', $that.attr('style'));
        });

        // temporarily must force hidden parents visible
        $hiddenParents.css('display', 'block');

        // get rows if using byRow, otherwise assume one row
        if (opts.byRow && !opts.target) {

            // must first force an arbitrary equal height so floating elements break evenly
            $elements.each(function() {
                var $that = $(this),
                    display = $that.css('display');

                // temporarily force a usable display value
                if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
                    display = 'block';
                }

                // cache the original inline style
                $that.data('style-cache', $that.attr('style'));

                $that.css({
                    'display': display,
                    'padding-top': '0',
                    'padding-bottom': '0',
                    'margin-top': '0',
                    'margin-bottom': '0',
                    'border-top-width': '0',
                    'border-bottom-width': '0',
                    'height': '100px',
                    'overflow': 'hidden'
                });
            });

            // get the array of rows (based on element top position)
            rows = _rows($elements);

            // revert original inline styles
            $elements.each(function() {
                var $that = $(this);
                $that.attr('style', $that.data('style-cache') || '');
            });
        }

        $.each(rows, function(key, row) {
            var $row = $(row),
                targetHeight = 0;

            if (!opts.target) {
                // skip apply to rows with only one item
                if (opts.byRow && $row.length <= 1) {
                    $row.css(opts.property, '');
                    return;
                }

                // iterate the row and find the max height
                $row.each(function(){
                    var $that = $(this),
                        style = $that.attr('style'),
                        display = $that.css('display');

                    // temporarily force a usable display value
                    if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
                        display = 'block';
                    }

                    // ensure we get the correct actual height (and not a previously set height value)
                    var css = { 'display': display };
                    css[opts.property] = '';
                    $that.css(css);

                    // find the max height (including padding, but not margin)
                    if ($that.outerHeight(false) > targetHeight) {
                        targetHeight = $that.outerHeight(false);
                    }

                    // revert styles
                    if (style) {
                        $that.attr('style', style);
                    } else {
                        $that.css('display', '');
                    }
                });
            } else {
                // if target set, use the height of the target element
                targetHeight = opts.target.outerHeight(false);
            }

            // iterate the row and apply the height to all elements
            $row.each(function(){
                var $that = $(this),
                    verticalPadding = 0;

                // don't apply to a target
                if (opts.target && $that.is(opts.target)) {
                    return;
                }

                // handle padding and border correctly (required when not using border-box)
                if ($that.css('box-sizing') !== 'border-box') {
                    verticalPadding += _parse($that.css('border-top-width')) + _parse($that.css('border-bottom-width'));
                    verticalPadding += _parse($that.css('padding-top')) + _parse($that.css('padding-bottom'));
                }

                // set the height (accounting for padding and border)
                $that.css(opts.property, (targetHeight - verticalPadding) + 'px');
            });
        });

        // revert hidden parents
        $hiddenParents.each(function() {
            var $that = $(this);
            $that.attr('style', $that.data('style-cache') || null);
        });

        // restore scroll position if enabled
        if (matchHeight._maintainScroll) {
            $(window).scrollTop((scrollTop / htmlHeight) * $('html').outerHeight(true));
        }

        return this;
    };

    /*
    *  matchHeight._applyDataApi
    *  applies matchHeight to all elements with a data-match-height attribute
    */

    matchHeight._applyDataApi = function() {
        var groups = {};

        // generate groups by their groupId set by elements using data-match-height
        $('[data-match-height], [data-mh]').each(function() {
            var $this = $(this),
                groupId = $this.attr('data-mh') || $this.attr('data-match-height');

            if (groupId in groups) {
                groups[groupId] = groups[groupId].add($this);
            } else {
                groups[groupId] = $this;
            }
        });

        // apply matchHeight to each group
        $.each(groups, function() {
            this.matchHeight(true);
        });
    };

    /*
    *  matchHeight._update
    *  updates matchHeight on all current groups with their correct options
    */

    var _update = function(event) {
        if (matchHeight._beforeUpdate) {
            matchHeight._beforeUpdate(event, matchHeight._groups);
        }

        $.each(matchHeight._groups, function() {
            matchHeight._apply(this.elements, this.options);
        });

        if (matchHeight._afterUpdate) {
            matchHeight._afterUpdate(event, matchHeight._groups);
        }
    };

    matchHeight._update = function(throttle, event) {
        // prevent update if fired from a resize event
        // where the viewport width hasn't actually changed
        // fixes an event looping bug in IE8
        if (event && event.type === 'resize') {
            var windowWidth = $(window).width();
            if (windowWidth === _previousResizeWidth) {
                return;
            }
            _previousResizeWidth = windowWidth;
        }

        // throttle updates
        if (!throttle) {
            _update(event);
        } else if (_updateTimeout === -1) {
            _updateTimeout = setTimeout(function() {
                _update(event);
                _updateTimeout = -1;
            }, matchHeight._throttle);
        }
    };

    /*
    *  bind events
    */

    // apply on DOM ready event
    $(matchHeight._applyDataApi);

    // update heights on load and resize events
    $(window).bind('load', function(event) {
        matchHeight._update(false, event);
    });

    // throttled update heights on resize events
    $(window).bind('resize orientationchange', function(event) {
        matchHeight._update(true, event);
    });

});
/*! waitForImages jQuery Plugin 2016-01-04 */
!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){var b="waitForImages";a.waitForImages={hasImageProperties:["backgroundImage","listStyleImage","borderImage","borderCornerImage","cursor"],hasImageAttributes:["srcset"]},a.expr[":"]["has-src"]=function(b){return a(b).is('img[src][src!=""]')},a.expr[":"].uncached=function(b){return a(b).is(":has-src")?!b.complete:!1},a.fn.waitForImages=function(){var c,d,e,f=0,g=0,h=a.Deferred();if(a.isPlainObject(arguments[0])?(e=arguments[0].waitForAll,d=arguments[0].each,c=arguments[0].finished):1===arguments.length&&"boolean"===a.type(arguments[0])?e=arguments[0]:(c=arguments[0],d=arguments[1],e=arguments[2]),c=c||a.noop,d=d||a.noop,e=!!e,!a.isFunction(c)||!a.isFunction(d))throw new TypeError("An invalid callback was supplied.");return this.each(function(){var i=a(this),j=[],k=a.waitForImages.hasImageProperties||[],l=a.waitForImages.hasImageAttributes||[],m=/url\(\s*(['"]?)(.*?)\1\s*\)/g;e?i.find("*").addBack().each(function(){var b=a(this);b.is("img:has-src")&&!b.is("[srcset]")&&j.push({src:b.attr("src"),element:b[0]}),a.each(k,function(a,c){var d,e=b.css(c);if(!e)return!0;for(;d=m.exec(e);)j.push({src:d[2],element:b[0]})}),a.each(l,function(a,c){var d=b.attr(c);return d?void j.push({src:b.attr("src"),srcset:b.attr("srcset"),element:b[0]}):!0})}):i.find("img:has-src").each(function(){j.push({src:this.src,element:this})}),f=j.length,g=0,0===f&&(c.call(i[0]),h.resolveWith(i[0])),a.each(j,function(e,j){var k=new Image,l="load."+b+" error."+b;a(k).one(l,function m(b){var e=[g,f,"load"==b.type];return g++,d.apply(j.element,e),h.notifyWith(j.element,e),a(this).off(l,m),g==f?(c.call(i[0]),h.resolveWith(i[0]),!1):void 0}),j.srcset&&(k.srcset=j.srcset),k.src=j.src})}),h.promise()}});