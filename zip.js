function unzipKeyFrame(keyframe) {
    // var dateStart = new Date();
    if(keyframe && keyframe.type == 'k' && keyframe.z) {
        var temp = unzipString(keyframe.z);
      var unzippedKeyFrame = JSON.parse(temp);
      if(unzippedKeyFrame && unzippedKeyFrame[0] && unzippedKeyFrame[0].k && unzippedKeyFrame[0].k.st == 'z') {
        var k = unzippedKeyFrame[0].k;
        k.s = top.unzipWithZip2DArray(k.s, k.r, k.c, null);
        k.st = 'set';
      }
      // console.log("cost: "+((new Date()).getTime() - dateStart.getTime()) + "ms");
      return unzippedKeyFrame;
    }else {
      return [keyframe];
    }
    // return unzipString(keyframe);
  }
  function unzipString(zipped) {
    var unzip = null;
    if(zipped) {
      // base64 convert to Unit8Array
      // var zipUint8Array = new Uint8Array(atob(zipped).split("").map(function(c) {
      //   return c.charCodeAt(0);
      // }));
  
      var zippidAtob = atob(zipped);
      var length = zippidAtob.length;
      var zipUint8Array = new Uint8Array(length);
      for(var i=0; i<length; i++) {
        zipUint8Array[i] = zippidAtob.charCodeAt(i);
      }
  
      // zip convert to unzip
      var unzipUint8Array = pako ? pako.inflate(zipUint8Array) : null;
      // Unit8Array to string
      // escape is deprecated by ECMA, browser maybe deprecate it sometime in the future. use escape is faster.
      if(typeof TextDecoder === 'function') {
        unzip = new TextDecoder("utf-8").decode(unzipUint8Array);
      }else if(typeof escape === 'function') {
        unzip = Uint8ToStringWithEscape(unzipUint8Array);
      }else {
        unzip = Uint8ToString(unzipUint8Array);
      }
    }
  
    return unzip;
  }
  function Uint8ToStringWithEscape(u8a){
    var CHUNK_SZ = 0x8000;
    var c = [];
    for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
      c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
    }
    var str = c.join("");
    // Solve the Chinese garbled question
    return decodeURIComponent( escape(str) );
  }
  
  function Uint8ToString(array) {
    var out, i, len, c;
    var char2, char3;
  
    out = [];
    len = array.length;
    i = 0;
    while(i < len) {
      c = array[i++];
      switch(c >> 4)
      {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out.push( String.fromCharCode(c) );
        break;
        case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out.push( String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F)) );
        break;
        case 14:
          // 1110 xxxx  10xx xxxx  10xx xxxx
          char2 = array[i++];
          char3 = array[i++];
          out.push( String.fromCharCode(((c & 0x0F) << 12) |
            ((char2 & 0x3F) << 6) |
            ((char3 & 0x3F) << 0)) );
          break;
      }
    }
    return out.join("");
  }
  
  function zipKeyFrame(keyframe) {
    var result = null;
    try {
      zipKeyFrameStyle(keyframe);
      var keyframeString = JSON.stringify([keyframe]);
      var zip = pako ? pako.deflate(keyframeString) : null;
      if(zip) {
        var zipMap = {
          type: 'k',
          z: u8tobase64(zip) // Unit8Array convert to base64
        };
        result = JSON.stringify( [zipMap] );
      }
    } catch (err) {
      console.log(err);
    }
    return result;
  }
  
  function zipKeyFrameStyle(keyframe) {
    if(!keyframe || !keyframe.k) {
      return ;
    }
    var styleType = keyframe.k.st, styleSet = keyframe.k.s, styleKey;
    if(styleType == 'set') {
      var zipArray, lengthStyleZipArray;
      try {
        var lengthStyleArray = top.zipString(JSON.stringify(styleSet)).length;
      }catch(e) {
        zipArray = top.zip2DArray(styleSet);
        styleType = 'z'; // zip
        styleKey = zipArray;
      }
      if(!zipArray) {
        zipArray = top.zip2DArray(styleSet);
        lengthStyleZipArray = top.zipString(JSON.stringify(zipArray)).length;
        if(lengthStyleArray*0.9 > lengthStyleZipArray) {
          styleType = 'z'; // zip
          styleKey = zipArray;
        }else {
          styleType = 'set';
          styleKey = styleSet;
        }
      }
      keyframe.k.st = styleType;
      keyframe.k.s = styleKey;
    }
  }
  
  function zipString(string) {
    var zipped = pako ? pako.deflate(string) : null;
    return u8tobase64(zipped);// Unit8Array convert to base64
  }
  
  var BASE64_SOURCE_STRING_MAX_LENGTH = 6000;
  function u8tobase64(u8) {
    var base64 = "", i=0, length=u8.length;
    while((i*BASE64_SOURCE_STRING_MAX_LENGTH)<length) {
      base64 += btoa(String.fromCharCode.apply(null, Array.prototype.slice.call(u8, i*BASE64_SOURCE_STRING_MAX_LENGTH, (i+1)*BASE64_SOURCE_STRING_MAX_LENGTH)));
      i++;
    }
    return base64;
  }
  
  /* translate between string and range. */
  // convert range to zip string, eg. A1:AC200
  function getZipStringWithRange(range) {
    if(!range || !range.from || !range.to) {
      return "";
    }
  
    var topLeftBottomRight = getTopLeftBottomRightCorners(range),
      topLeft = topLeftBottomRight[0],
      bottomRight = topLeftBottomRight[1];
  
    if(topLeft && bottomRight) {
      if(topLeft.col == bottomRight.col && topLeft.row == bottomRight.row) {
        return getZipStringWithCell(topLeft);
      }else {
        var topLeftCellZipString = getZipStringWithCell(topLeft);
        var bottomRightCellZipString = getZipStringWithCell(bottomRight);
        if(topLeftCellZipString && bottomRightCellZipString) {
          return topLeftCellZipString + ':' + bottomRightCellZipString;
        }else if(topLeftCellZipString) {
          return topLeftCellZipString;
        }else if(bottomRightCellZipString) {
          return bottomRightCellZipString;
        }
      }
    }
    return "";
  }
  // get TopLeft and BottomRight corners from range
  function getTopLeftBottomRightCorners(range) {
    if(!range || !range.from || !range.to) {
      return [];
    }
    var topLeft = null, bottomRight = null;
    if( (typeof range.from.row == 'number') && (typeof range.from.col == 'number') && (typeof range.to.row == 'number') && (typeof range.to.col == 'number') ){
      topLeft = {
        row: Math.min(range.from.row, range.to.row),
        col: Math.min(range.from.col, range.to.col)
      };
      bottomRight = {
        row: Math.max(range.from.row, range.to.row),
        col: Math.max(range.from.col, range.to.col)
      };
    }
  
    return [topLeft, bottomRight];
  }
  // convert zip string to cell
  function getZipStringWithCell(cell) {
    var cellZipString = "";
    if(cell && (typeof cell.row == 'number') && (typeof cell.col == 'number') ) {
      var startCharCode = "A".charCodeAt(0);
      var lengthCharCode = "Z".charCodeAt(0) - "A".charCodeAt(0) + 1;
      if(!lengthCharCode){
        return "";
      }
      var divisor = cell.col;
      var remainder = 0;
      var first = true;
      do{
        remainder = Math.floor( divisor%lengthCharCode - (first?0:1) );
        divisor = Math.floor( divisor/lengthCharCode );
        cellZipString = String.fromCharCode(remainder+startCharCode) + cellZipString;
        first = false;
      }while(divisor);
      cellZipString = cellZipString + (cell.row+1);
    }
    return cellZipString;
  }
  
  
  // convert zip string to range. zip string looks like "A1:B3" or "D10"
  function getRangeWithZipString(zipString) {
    if(typeof zipString != 'string') {
      return ;
    }
    var cellsZipString = zipString.split(':');
    var range;
    if(cellsZipString.length == 1) {
      var cell = getCellWithZipString(cellsZipString[0]);
      if(cell) {
        range = {
          from: cell,
          to: cell
        };
      }
    }else if(cellsZipString.length == 2) {
      var from = getCellWithZipString(cellsZipString[0]);
      var to = getCellWithZipString(cellsZipString[1]);
      if(from && to) {
        range = {
          from: from,
          to: to
        };
      }
    }
    return range;
  }
  // convert zip string, such as "F4", to cell.
  function getCellWithZipString(zipString) {
    if(typeof zipString != 'string') {
      return ;
    }
    var pattern = new RegExp("^[A-Z]+[0-9]+$");
    var isCellZipString = pattern.test(zipString);
    if(isCellZipString) {
      var col, row;
      // get col
      col = getColWithZipString(zipString);
      if(typeof col != 'number' || isNaN(col)) { return ; }
      // get row
      row = getRowWithZipString(zipString);
      if(typeof row != 'number' || isNaN(row)) { return ; }
      return {
        row: row,
        col: col
      };
    }
  }
  // convert zip string ,such as "A", "AB", to col number
  function getColWithZipString(zipString) {
    if(typeof zipString != 'string') {
      return ;
    }
    var col;
    var colpattern = new RegExp("^[A-Z]+");
    var colZipString = (zipString.match(colpattern))[0];
    var startCharCode = "A".charCodeAt(0);
    var lengthCharCode = "Z".charCodeAt(0) - "A".charCodeAt(0) + 1;
    for(var i=0, iLen=colZipString.length; i<iLen; i++) {
      if( i==colZipString.length-1 ) {
        col = colZipString.charCodeAt(i) - startCharCode + (typeof col == 'number' ? lengthCharCode * col : 0);
      }else {
        col = colZipString.charCodeAt(i) - startCharCode + 1 + (typeof col == 'number' ? lengthCharCode * col : 0);
      }
    }
    return col;
  }
  // convert zip string ,such as "1", "12", to row number
  function getRowWithZipString(zipString) {
    if(typeof zipString != 'string') {
      return ;
    }
    var row;
    var rowpattern = new RegExp("[0-9]+$");
    var rowZipString = (zipString.match(rowpattern))[0];
    row = parseInt(rowZipString) - 1;
    return row;
  }
  
  
  /* convert 2D array to zipped object */
  // zip two-dimensional array, get zipped object.
  function zip2DArray(array) {
    var zipArray = searchWholeArrayL2R(array);
    return zipArray;
  }
  // search the whole array from left to right, from top to bottom.
  function searchWholeArrayL2R(arraySrc) {
    if(!arraySrc || !arraySrc.length) {
      return ;
    }
  
    // var dateStart = new Date();
    var array = deepClone(arraySrc);
    var zipArray = [];
    for(var i=0, iLen=array.length; i<iLen; i++) {
      for(var j=0, jLen=array[i].length; j<jLen; j++) {
        var target = array[i][j];
        if(!target) {
          continue;
        }
        if(target.isSearched && target.isSearched == MEET_FULL_SEARCHED) {
          continue;
        }
        var start = {
          row: i,
          col: j
        };
        var end = searchArrayL2R(array, start, isMeetConditions(target));
        if(!end) {
          continue;
        }
        setArraySearchedFlag(array, target, start, end);
        var range = {
          from: start,
          to: end
        };
        var targetCopy = deepClone(target);
        delete targetCopy.isSearched;
        var item = [getZipStringWithRange(range), targetCopy];
        zipArray.push(item);
      }
    }
    // console.log("search WholeArrayL2R cost:"+(new Date() - dateStart)+"ms.");
    return zipArray;
  
    function isMeetConditions(target) {
      var judgeFunction = function(item) {
        var ieMeet = isMeetConditionsWithTarget(item, target);
        return ieMeet;
      };
      return judgeFunction;
    }
  }
  var MEET_FULL_SEARCHED = 1;
  var MEET_PART_SEARCHED = 2;
  function isMeetConditionsWithTarget(item, target) {
    if(item == null && target == null) {
      return true;
    }else if(item == null || target == null) {
      return false;
    }
    if(typeof item != 'object' || typeof target != 'object') {
      return false;
    }
  
    if(item.isSearched && (item.isSearched == MEET_FULL_SEARCHED)) {
      return false;
    }
  
    var isMeet = true;
    for(var key in target) {
      if(target[key] != item[key]) {
        isMeet = false;
      }
    }
    return isMeet;
  }
  
  function setArraySearchedFlag(array, target, start, end) {
    if( (!start || typeof start.row != 'number' || typeof start.col != 'number') ||
      (!end || typeof end.row != 'number' || typeof end.col != 'number')) {
      return ;
    }
    if(!start){
      start = {
        row: 0,
        col: 0
      };
    }
  
    var targetPropertyLength = Object.getOwnPropertyNames(target).length - (target.isSearched?1:0);
    for(var i=start.row; i<=end.row; i++) {
      for(var j=start.col; j<=end.col; j++) {
        var item = array[i][j];
        if(!item) {
          continue;
        }
        if(targetPropertyLength == (Object.getOwnPropertyNames(item).length - (item.isSearched?1:0))) {
          item.isSearched = MEET_FULL_SEARCHED;
        }else {
          item.isSearched = MEET_PART_SEARCHED;
        }
      }
    }
  }
  
  // search array from left to right, from top to bottom, find the range which meet conditions
  function searchArrayL2R(array, start, isMeetConditions) {
    if(!array || !array.length || !array[start.row].length) {
      return ;
    }
    if(!start){
      start = {
        row: 0,
        col: 0
      };
    }
    var i, iLen, j, jLen;
  
    var end = {
      row: start.row,
      col: start.col
    };
    for(i=start.row, iLen=array.length; i<iLen; i++) {
      var row = array[i];
      for(j=start.col, jLen=(jLen?Math.min(jLen, row.length):row.length); j<jLen; j++) {
        var item = row[j];
        if(!isMeetConditions(item)) {
          if(i == start.row) {
            end.col = j - 1;
            jLen = j;
          }else if(i == array.length - 1) {
            end.row = array.length - 1;
          }else {
            if(j < (end.col+1)) {
              end.row = i - 1;
              return end;
            }
          }
          break;
        }else if(j == row.length-1) {
          end.col = row.length - 1;
          if(i == array.length - 1) {
            end.row = array.length - 1;
          }
        }else if((i == array.length - 1) && (j == jLen - 1)) {
          end.row = array.length - 1;
        }
      }
    }
    return end;
  }
  
  // unzip zipped two-dimensional object array json string, return the two-dimensional object array
  function unzipWithZip2DArrayString(zipArrayJSON, row, col, itemMakeUp) {
    var unzip = top.unzipString(zipArrayJSON);
    if(typeof unzip != 'string') {
      return ;
    }
  
    try{
      var zipArray = JSON.parse(unzip);
    } catch(err){
      console.log(err);
    }
  
    var ua = unzip2Array(zipArray, row, col, itemMakeUp);
    return ua;
  }
  // unzip
  function unzipWithZip2DArray(zipArray, rowCount, colCount, itemMakeUp) {
    if( !zipArray || typeof zipArray.length == 'undefined') {
      if(rowCount && colCount) {
        return makeUpBlankArray([], rowCount, colCount, itemMakeUp);
      }else {
        return ;
      }
    }
    var unzipArray = [];
    for(var i=0, iLen=zipArray.length; i<iLen; i++) {
      var zipItem = zipArray[i];
      var range = getRangeWithZipString(zipItem[0]);
      var object = zipItem[1];
      if(!range || !object) {
        continue;
      }
      for(var row=range.from.row; row<=range.to.row; row++) {
        if(!unzipArray[row]) {
          unzipArray[row] = [];
        }
        for(var col=range.from.col; col<=range.to.col; col++) {
          var item = unzipArray[row][col];
          if(!item) {
            item = {};
            unzipArray[row][col] = item;
          }
          for(var key in object) {
            if(typeof item[key] == 'undefined') {
              item[key] = object[key];
            }
          }
        }
      }
    }
    if(rowCount && colCount) {
      makeUpBlankArray(unzipArray, rowCount, colCount, itemMakeUp);
    }
    return unzipArray;
  }
  
  function makeUpBlankArray(array, rowCount, colCount, itemMakeUp) {
    if( !array ) {
      array = [];
    }
    for(var row=0; row<rowCount; row++) {
      if(!array[row]) {
        array[row] = [];
      }
      for(var col=0; col<colCount; col++) {
        if( typeof array[row][col] == 'undefined') {
          array[row][col] = itemMakeUp;
        }
      }
    }
    return array;
  }
  
  /* for paste and match prop */
  var MAX_LENGTH_ARRAY_UNZIP_LIMIT = 10*1000;
  function getMinObjectWith2DArray(array) {
    var arrayString = JSON.stringify(array);
    if(arrayString.length < MAX_LENGTH_ARRAY_UNZIP_LIMIT){
      return array;
    }
    var zipArray, zipArrayZipString;
    try{
      var arrayZipString = top.zipString(arrayString);
    }catch(e) {
      zipArray = zip2DArray(array);
      return { z: zipArray };
    }
  
    if(!zipArray) {
      var lengthArrayZipString = arrayZipString.length;
      zipArray = zip2DArray(array);
      zipArrayZipString = top.zipString(JSON.stringify(zipArray));
      var lengthZipArrayZipString = zipArrayZipString.length;
    }
  
    if(lengthArrayZipString*0.9 > lengthZipArrayZipString) {
      return { z: zipArray };
    }else {
      return array;
    }
  }
  
  function getMinState(state) {
    if(state && state.style) {
      var minObject = getMinObjectWith2DArray(state.style);
      if(minObject && minObject.z) {
        return minObject;
      }
    }
    return state;
  }
  
  function getNormalState(state, rowCount, colCount, itemMakeUp) {
    if(state && state.z) {
      var normalState = unzipWithZip2DArray(state.z, rowCount, colCount, itemMakeUp);
      if(normalState) {
        return {style: normalState};
      }
    }
    return state;
  }
  
  // zip paste action
  function zipPasteAction(action, strAction) {
    if(action && action.type == 'paste' && !action.z) {
      action.stateBefore && (action.stateBefore = getMinState(action.stateBefore));
      action.stateUpdated && (action.stateUpdated = getMinState(action.stateUpdated));
      return {
        type : 'paste',
        z: zipString( strAction?strAction:JSON.stringify(action) )
      };
    }
    return action;
  }
  
  function unzipPasteAction(action) {
    if(action && action.type=='paste' && action.z) {
      var newAction = JSON.parse( unzipString(action.z) );
      var rowCount = Math.abs(newAction.range.to.row - newAction.range.from.row) + 1;
      var colCount = Math.abs(newAction.range.to.col - newAction.range.from.col) + 1;
      newAction.stateBefore && (newAction.stateBefore = getNormalState(newAction.stateBefore, rowCount, colCount, null));
      newAction.stateUpdated && (newAction.stateUpdated = getNormalState(newAction.stateUpdated, rowCount, colCount, null));
      return newAction;
    }
    return action;
  }
  
  var MAX_LENGTH_PASTE_ACTION_UNZIP_LIMIT = 300*1000;
  var MAX_CELL_COUNTS_LIMIT = 5000;
  function getMinActionWithPasteAction(action) {
    if(action && action.type == 'paste' && !action.z) {
      var cellCounts = (Math.abs(action.range.to.col - action.range.from.col) + 1) * (Math.abs(action.range.to.row - action.range.from.row) + 1);
      if(cellCounts > MAX_CELL_COUNTS_LIMIT) {
        return zipPasteAction(action);
      }else {
        var pasteActionString = JSON.stringify( action );
        if(pasteActionString.length > MAX_LENGTH_PASTE_ACTION_UNZIP_LIMIT) {
          return zipPasteAction(action, pasteActionString);
        }
      }
    }
    return action;
  }
  
  function zipNormalAction(action, strAction) {
    return {
      type: action.type,
      z: zipString( strAction ? strAction : JSON.stringify(action) )
    }
  }
  
  function getMinActionWithEmptyCellAction(action) {
    if(action && action.type == 'emptycell' && !action.z) {
      var emptyCellActionString = JSON.stringify( action );
      if(emptyCellActionString.length > MAX_LENGTH_PASTE_ACTION_UNZIP_LIMIT) {
        return zipNormalAction(action, emptyCellActionString);
      }
    }
    return action;
  }
  
  function getNormalActionWithPasteAction(action) {
    if(action && action.type=='paste' && action.z) {
      return unzipPasteAction(action);
    }
    return action;
  }
  
  function checkActionsIfNeedZip(actions) {
    for(var i=0, iLen=actions.length; i<iLen; i++) {
      var action = actions[i];
      if(action) {
        if(action.type==='paste') {
          actions[i] = getMinActionWithPasteAction(action);
        }else if(action.type==='emptycell') {
          actions[i] = getMinActionWithEmptyCellAction(action);
        }
      }
    }
    return actions;
  }
  
  function checkActionsIfNeedUnzip(actions) {
    for(var i=0, iLen=actions.length; i<iLen; i++) {
      var action = actions[i];
      if(action && action.z) {
        if(action.type==='paste') {
          actions[i] = getNormalActionWithPasteAction(action);
        }else if(action.type==='emptycell') {
          actions[i] = JSON.parse( unzipString(action.z) );
        }
      }
    }
    return actions;
  }