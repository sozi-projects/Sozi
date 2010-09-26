
Function.prototype.bind = function(obj) {
   var args = Array.prototype.slice.call(arguments, 1);
   var f = this;
   return function() {
      f.apply(obj, args.concat(Array.prototype.slice.call(arguments)));
   };
};

