/*
 * Safe player extraction for HDFilmCehennemi. No downloaded JavaScript is run.
 * Decoder arithmetic and legacy variants adapted from the MIT-licensed
 * HDFilmCehennemi Stremio Addon, Copyright (c) 2024 enXov.
 * See THIRD_PARTY_NOTICES.md for the original license.
 */
'use strict';

var MAX_INPUT = 2 * 1024 * 1024;
var MAX_ITEMS = 512;

function trim(value) { return String(value || '').replace(/^\s+|\s+$/g, ''); }

function htmlEntities(value) {
    return String(value || '').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, function (all, name) {
        var lower = name.toLowerCase();
        var code;
        if (lower.charAt(0) === '#') {
            code = lower.charAt(1) === 'x' ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
            return code > 0 && code <= 65535 ? String.fromCharCode(code) : all;
        }
        return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[lower] || all;
    });
}

function absoluteUrl(value, baseUrl) {
    var url = trim(htmlEntities(value));
    var base = /^(https?):\/\/([^\/?#]+)([^?#]*)/i.exec(trim(baseUrl));
    var parsed;
    var path;
    var suffix;
    var parts;
    var out = [];
    var i;
    if (!url || url.length > 16384 || /[\x00-\x20\x7f\\<>"']/.test(url)) return '';
    if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^https?:\/\//i.test(url)) return '';
    if (url.slice(0, 2) === '//') url = (base ? base[1] : 'https') + ':' + url;
    else if (!/^https?:\/\//i.test(url)) {
        if (!base) return '';
        if (url.charAt(0) === '#') return '';
        if (url.charAt(0) === '?') url = base[1] + '://' + base[2] + (base[3] || '/') + url;
        else url = base[1] + '://' + base[2] + (url.charAt(0) === '/' ? url : (base[3] || '/').replace(/[^/]*$/, '') + url);
    }
    parsed = /^(https?):\/\/([^\/?#]+)([^?#]*)([?#][\s\S]*)?$/i.exec(url);
    if (!parsed || !parsed[2] || /[@\s]/.test(parsed[2]) || !/^(?:\[[0-9a-f:.]+\]|[a-z0-9._-]+)(?::\d{1,5})?$/i.test(parsed[2])) return '';
    path = parsed[3] || '/';
    suffix = parsed[4] || '';
    parts = path.split('/');
    for (i = 0; i < parts.length; i++) {
        if (parts[i] === '..') { if (out.length > 1) out.pop(); }
        else if (parts[i] !== '.') out.push(parts[i]);
    }
    path = out.join('/');
    if (path.charAt(0) !== '/') path = '/' + path;
    return parsed[1].toLowerCase() + '://' + parsed[2] + path + suffix;
}

function looksLikeMedia(url) {
    return /\.(?:m3u8|mp4|mpd|webm|mkv|mov|m4v)(?:[?#]|$)/i.test(url) || /\/hls\//i.test(url) || /\/master\.txt(?:[?#]|$)/i.test(url);
}

/* Read a JavaScript string literal as data, including escaped quotes. */
function readString(text, start) {
    var quote = text.charAt(start);
    var result = '';
    var i = start + 1;
    var c;
    var hex;
    var escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\x00' };
    if (quote !== '"' && quote !== "'") return null;
    for (; i < text.length; i++) {
        c = text.charAt(i);
        if (c === quote) return { value: result, end: i + 1 };
        if (c === '\n' || c === '\r') return null;
        if (c !== '\\') { result += c; continue; }
        i++;
        c = text.charAt(i);
        if (!c) return null;
        if (c === '\n') continue;
        if (c === '\r') { if (text.charAt(i + 1) === '\n') i++; continue; }
        if (c === 'x' || c === 'u') {
            hex = text.substr(i + 1, c === 'x' ? 2 : 4);
            if (!(c === 'x' ? /^[0-9a-f]{2}$/i : /^[0-9a-f]{4}$/i).test(hex)) return null;
            result += String.fromCharCode(parseInt(hex, 16));
            i += hex.length;
        } else if (Object.prototype.hasOwnProperty.call(escapes, c)) result += escapes[c];
        else if (/[1-9]/.test(c)) return null;
        else result += c;
    }
    return null;
}

function skipSpace(text, index) { while (/\s/.test(text.charAt(index)) && index < text.length) index++; return index; }

/* Accept only literal data: strings, numbers, booleans, null, arrays, objects. */
function readLiteral(text, start, depth) {
    var i = skipSpace(text, start);
    var c = text.charAt(i);
    var item;
    var result;
    var key;
    var match;
    var count = 0;
    if (depth > 12) return null;
    if (c === '"' || c === "'") return readString(text, i);
    if (c === '[' || c === '{') {
        result = c === '[' ? [] : {};
        i = skipSpace(text, i + 1);
        if (text.charAt(i) === (c === '[' ? ']' : '}')) return { value: result, end: i + 1 };
        while (i < text.length && count++ < MAX_ITEMS) {
            if (c === '{') {
                if (text.charAt(i) === '"' || text.charAt(i) === "'") item = readString(text, i);
                else {
                    match = /^[a-zA-Z_$][\w$]*/.exec(text.slice(i));
                    item = match ? { value: match[0], end: i + match[0].length } : null;
                }
                if (!item) return null;
                key = item.value;
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') return null;
                i = skipSpace(text, item.end);
                if (text.charAt(i) !== ':') return null;
                i = skipSpace(text, i + 1);
            }
            item = readLiteral(text, i, depth + 1);
            if (!item) return null;
            if (c === '[') result.push(item.value); else result[key] = item.value;
            i = skipSpace(text, item.end);
            if (text.charAt(i) === (c === '[' ? ']' : '}')) return { value: result, end: i + 1 };
            if (text.charAt(i) !== ',') return null;
            i = skipSpace(text, i + 1);
            if (text.charAt(i) === (c === '[' ? ']' : '}')) return { value: result, end: i + 1 };
        }
        return null;
    }
    match = /^(?:true|false|null)(?![\w$])/.exec(text.slice(i));
    if (match) return { value: match[0] === 'true' ? true : match[0] === 'false' ? false : null, end: i + match[0].length };
    match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w$.])/.exec(text.slice(i));
    if (match && isFinite(Number(match[0]))) return { value: Number(match[0]), end: i + match[0].length };
    return null;
}

/* Find a closing function brace while ignoring strings, comments and regexes. */
function closingBrace(text, start) {
    var depth = 1;
    var i = start + 1;
    var item;
    var c;
    var j;
    var inClass;
    var previous;
    for (; i < text.length; i++) {
        c = text.charAt(i);
        if (c === '"' || c === "'") {
            item = readString(text, i);
            if (!item) return -1;
            i = item.end - 1;
        } else if (c === '/' && text.charAt(i + 1) === '/') {
            j = text.indexOf('\n', i + 2); i = j < 0 ? text.length : j;
        } else if (c === '/' && text.charAt(i + 1) === '*') {
            j = text.indexOf('*/', i + 2); if (j < 0) return -1; i = j + 1;
        } else if (c === '/') {
            previous = i - 1;
            while (previous >= 0 && /\s/.test(text.charAt(previous))) previous--;
            if (!/[=(,:!&|?;{\[]/.test(text.charAt(previous))) continue;
            inClass = false;
            for (j = i + 1; j < text.length; j++) {
                if (text.charAt(j) === '\\') { j++; continue; }
                if (text.charAt(j) === '[') inClass = true;
                else if (text.charAt(j) === ']') inClass = false;
                else if (text.charAt(j) === '/' && !inClass) break;
                else if (text.charAt(j) === '\n') return -1;
            }
            if (j >= text.length) return -1;
            i = j;
        } else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) return i;
    }
    return -1;
}

function base64Decode(value) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var str = String(value).replace(/\s/g, '');
    var raw = str.replace(/=+$/, '');
    var bits = 0;
    var pending = 0;
    var result = '';
    var i;
    var n;
    if (!raw || !/^[A-Za-z0-9+/]*={0,2}$/.test(str) || raw.length % 4 === 1 || (str.indexOf('=') >= 0 && str.length % 4 !== 0)) throw new Error('Invalid base64');
    for (i = 0; i < raw.length; i++) {
        n = alphabet.indexOf(raw.charAt(i));
        pending = (pending << 6) | n;
        bits += 6;
        if (bits >= 8) { bits -= 8; result += String.fromCharCode((pending >> bits) & 255); pending &= (1 << bits) - 1; }
    }
    if (pending !== 0) throw new Error('Invalid base64 tail');
    return result;
}

function rotate(value, shift) {
    return value.replace(/[a-zA-Z]/g, function (c) {
        var n = c.charCodeAt(0);
        var base = n <= 90 ? 65 : 97;
        return String.fromCharCode(((n - base + shift) % 26 + 26) % 26 + base);
    });
}

function applyDecodeSteps(parts, steps) {
    var result = parts.join('');
    var i;
    var j;
    var step;
    var output;
    var acc;
    var byte;
    if (result.length > MAX_INPUT || steps.length > 16) throw new Error('Decoder limit');
    for (i = 0; i < steps.length; i++) {
        step = steps[i];
        if (step.op === 'base64') result = base64Decode(result);
        else if (step.op === 'reverse') result = result.split('').reverse().join('');
        else if (step.op === 'rot') result = rotate(result, step.shift);
        else if (step.op === 'unmix' || step.op === 'xor') {
            if (step.op === 'unmix' && !(step.offset > 0)) throw new Error('Invalid unmix');
            output = ''; acc = step.seed || 0;
            for (j = 0; j < result.length; j++) {
                byte = result.charCodeAt(j);
                if (step.op === 'unmix') output += String.fromCharCode(((byte - (step.magic % (j + step.offset))) % 256 + 256) % 256);
                else { acc = (acc + step.inc) % 256; output += String.fromCharCode(byte ^ acc); acc = (acc + byte) % 256; }
            }
            result = output;
        } else throw new Error('Unknown operation');
    }
    return result;
}

function parseInlineDecoder(html) {
    var decoders = [];
    var re = /function\s+(dc_\w+)\s*\(\s*[\w$]+\s*\)\s*\{/g;
    var fn;
    var end;
    var body;
    var calls;
    var call;
    var literal;
    var steps;
    var stepRe;
    var m;
    var i;
    var valid;
    var attempts = 0;
    var callAttempts;
    while ((fn = re.exec(html)) && decoders.length < 32 && attempts++ < 64) {
        end = closingBrace(html, re.lastIndex - 1);
        if (end < 0) continue;
        body = html.slice(re.lastIndex, end);
        /* Ignore comments so advertised examples cannot become decode steps. */
        body = body.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, '');
        steps = [];
        stepRe = /=\s*atob\(\s*[\w$]+\s*\)|[\w$]+\.split\(\s*(['"])\1\s*\)\.reverse\(\s*\)\.join\(\s*(['"])\2\s*\)|\(o\s*-\s*base\s*\+\s*(\d+)\)\s*%\s*26|charCode\s*-\s*\((\d+)\s*%\s*\(i\s*\+\s*(\d+)\)\)|(?:var|let|const)\s+acc\s*=\s*(\d+)[\s\S]{0,400}?acc\s*=\s*\(\s*acc\s*\+\s*(\d+)\s*\)\s*%\s*256/g;
        while ((m = stepRe.exec(body)) && steps.length <= 16) {
            if (/atob/.test(m[0])) steps.push({ op: 'base64' });
            else if (/reverse/.test(m[0])) steps.push({ op: 'reverse' });
            else if (m[3] !== undefined) steps.push({ op: 'rot', shift: Number(m[3]) % 26 });
            else if (m[4] !== undefined) steps.push({ op: 'unmix', magic: Number(m[4]), offset: Number(m[5]) });
            else if (/\^\s*acc\b/.test(body.slice(stepRe.lastIndex, stepRe.lastIndex + 200)) && /acc\s*=\s*\(\s*acc\s*\+\s*[\w$]+\s*\)\s*%\s*256/.test(body.slice(stepRe.lastIndex, stepRe.lastIndex + 300))) steps.push({ op: 'xor', seed: Number(m[6]) % 256, inc: Number(m[7]) % 256 });
        }
        if (!steps.length || steps.length > 16) continue;
        calls = new RegExp('\\b' + fn[1] + '\\s*\\(', 'g');
        callAttempts = 0;
        while ((call = calls.exec(html)) && decoders.length < 32 && callAttempts++ < 64) {
            literal = readLiteral(html, calls.lastIndex, 0);
            if (!literal || Object.prototype.toString.call(literal.value) !== '[object Array]' || html.charAt(skipSpace(html, literal.end)) !== ')') continue;
            valid = true;
            for (i = 0; i < literal.value.length; i++) if (typeof literal.value[i] !== 'string') valid = false;
            if (valid && literal.value.length) decoders.push({ steps: steps, parts: literal.value });
        }
        re.lastIndex = end + 1;
    }
    return decoders;
}

function unpackJS(payload, radix, count, keywords) {
    var words = keywords.split('|');
    var length = payload.length;
    if (radix < 2 || radix > 62 || radix % 1 || count % 1 || count > 4096 || count < 0 || words.length > 4096 || payload.length > MAX_INPUT || keywords.length > MAX_INPUT) return '';
    try { return payload.replace(/\b\w+\b/g, function (word) {
        var n = 0;
        var i;
        var code;
        for (i = 0; i < word.length; i++) {
            code = word.charCodeAt(i);
            code = code >= 48 && code <= 57 ? code - 48 : code >= 97 && code <= 122 ? code - 97 + 10 : code >= 65 && code <= 90 ? code - 65 + 36 : radix;
            if (code >= radix) return word;
            n = n * radix + code;
            if (n >= count) return word;
        }
        if (words[n]) {
            length += words[n].length - word.length;
            if (length > MAX_INPUT) throw new Error('Packed expansion limit');
            return words[n];
        }
        return word;
    }); } catch (ignoredLimit) { return ''; }
}

function unpackScripts(html) {
    var results = [];
    var re = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*(?:d|r)\s*\)\s*\{/g;
    var m;
    var end;
    var i;
    var values;
    var item;
    var n;
    var unpacked;
    var attempts = 0;
    while ((m = re.exec(html)) && results.length < 8 && attempts++ < 16) {
        end = closingBrace(html, re.lastIndex - 1);
        if (end < 0) continue;
        i = skipSpace(html, end + 1);
        if (html.charAt(i) !== '(') continue;
        i++;
        values = [];
        for (n = 0; n < 4; n++) {
            item = readLiteral(html, i, 0);
            if (!item) break;
            values.push(item.value);
            i = skipSpace(html, item.end);
            if (n < 3 && html.charAt(i++) !== ',') break;
        }
        if (values.length !== 4 || typeof values[0] !== 'string' || typeof values[1] !== 'number' || typeof values[2] !== 'number' || typeof values[3] !== 'string') continue;
        unpacked = unpackJS(values[0], values[1], values[2], values[3]);
        if (unpacked && unpacked.length <= MAX_INPUT) results.push(unpacked);
        re.lastIndex = end + 1;
    }
    return results;
}

function legacyCandidates(html) {
    var results = [];
    var re = /\bdc_\w+\s*\(/g;
    var match;
    var literal;
    var parts;
    var i;
    var j;
    var chain;
    var variants = [
        [{ op: 'base64' }, { op: 'reverse' }, { op: 'rot', shift: 13 }, { op: 'unmix', magic: 399756995, offset: 5 }],
        [{ op: 'reverse' }, { op: 'rot', shift: 13 }, { op: 'base64' }, { op: 'unmix', magic: 399756995, offset: 5 }],
        [{ op: 'reverse' }, { op: 'base64' }, { op: 'rot', shift: 13 }, { op: 'unmix', magic: 399756995, offset: 5 }]
    ];
    while ((match = re.exec(html)) && results.length < 32) {
        literal = readLiteral(html, re.lastIndex, 0);
        if (!literal || Object.prototype.toString.call(literal.value) !== '[object Array]') continue;
        parts = literal.value;
        for (i = 0; i < parts.length && typeof parts[i] === 'string'; i++) {}
        if (!parts.length || i !== parts.length) continue;
        for (j = 0; j < variants.length; j++) {
            chain = variants[j];
            try { results.push(applyDecodeSteps(parts, chain)); } catch (ignored) {}
        }
    }
    return results;
}

/*
 * October 2026 players use random identifiers and two known seeded formats.
 * Parse their data and arithmetic constants, never their JavaScript semantics.
 * The assigned format hides salt/operation strings amongst the ciphertext parts.
 */
function seededProfile(body, parameter) {
    var compact = body.replace(/\b(?:var|let|const)\s+/g, ';').replace(/\s+/g, '');
    var hash = /([\w$]+)=\(\1\*(\d+)\+([\w$]+)\)%(\d+)/.exec(compact);
    var format = compact.indexOf(parameter + '.splice(') >= 0 ? 'metadata' : 'static';
    var profile = { format: format };
    var second;
    var seed;
    var increment;
    var shuffleSeed;
    var shuffle;
    var xor;
    var metadata;
    var splice;
    var operation;
    var rotation;
    var saltRead;
    var literals = {};
    var declarations;
    var declaration;
    var literal;
    var saltName;
    var operationName;
    var byte;
    var index;
    var h1;
    var h2;
    var escape = function (value) { return value.replace(/[$]/g, '\\$'); };
    if (!hash) return null;
    h1 = escape(hash[1]); byte = escape(hash[3]);
    saltRead = new RegExp(byte + '=([\\w$]+)\\.charCodeAt\\(([\\w$]+)\\)').exec(compact);
    if (!saltRead) return null;
    saltName = saltRead[1]; index = escape(saltRead[2]);
    profile.hashMultiplier = Number(hash[2]); profile.hashModulus = Number(hash[4]);
    if (format === 'metadata') {
        metadata = new RegExp('([\\w$]+)=' + escape(parameter) + '\\.length-(\\d+),([\\w$]+)=\\1%(\\d+),([\\w$]+)=(\\d+)\\+\\(\\1%(\\d+)\\)').exec(compact);
        if (!metadata) return null;
        splice = new RegExp('([\\w$]+)=' + escape(parameter) + '\\.splice\\(' + escape(metadata[5]) + ',1\\)\\[0\\],([\\w$]+)=' + escape(parameter) + '\\.splice\\(' + escape(metadata[3]) + ',1\\)\\[0\\]').exec(compact);
        if (!splice || splice[2] !== saltName) return null;
        operationName = splice[1];
        profile.metadata = { removed: Number(metadata[2]), saltModulus: Number(metadata[4]), operationOffset: Number(metadata[6]), operationModulus: Number(metadata[7]) };
        second = new RegExp('([\\w$]+)=\\(\\1\\+\\(\\(' + byte + '<<(\\d+)\\)\\^' + index + '\\)\\)&255').exec(compact);
        if (!second) return null;
        h2 = escape(second[1]); profile.hashShift = Number(second[2]);
        seed = new RegExp('([\\w$]+)=\\(' + h1 + '\\*(\\d+)\\+' + h2 + '\\)%256').exec(compact);
        increment = new RegExp('([\\w$]+)=\\(' + h2 + '%(\\d+)\\)\\+(\\d+)').exec(compact);
        shuffleSeed = new RegExp('([\\w$]+)=\\(\\(' + h2 + '\\*(\\d+)\\+' + h1 + '\\)%(\\d+)\\)\\+(\\d+)').exec(compact);
    } else {
        second = new RegExp('([\\w$]+)=\\(\\1\\^\\(' + byte + '\\+' + index + '\\)\\)&255').exec(compact);
        if (!second) return null;
        h2 = escape(second[1]);
        seed = new RegExp('([\\w$]+)=\\(' + h1 + '\\+' + h2 + '\\)%256').exec(compact);
        increment = new RegExp('([\\w$]+)=\\(' + h1 + '%(\\d+)\\)\\+(\\d+)').exec(compact);
        shuffleSeed = new RegExp('([\\w$]+)=\\(\\(' + h1 + '\\*(\\d+)\\+' + h2 + '\\)%(\\d+)\\)\\+(\\d+)').exec(compact);
        declarations = /(?:var|let|const)\s+([\w$]+)\s*=\s*(['"])/g;
        while ((declaration = declarations.exec(body))) {
            literal = readString(body, declarations.lastIndex - 1);
            if (literal) literals[declaration[1]] = literal.value;
        }
        operation = /for\(([\w$]+)=([\w$]+)\.length-1;\1>=0;\1--\)/.exec(compact);
        if (!operation) return null;
        operationName = operation[2];
        profile.salt = literals[saltName]; profile.operations = literals[operationName];
    }
    if (!seed || !increment || !shuffleSeed) return null;
    profile.seedMultiplier = format === 'metadata' ? Number(seed[2]) : 1;
    profile.incrementModulus = Number(increment[2]); profile.incrementOffset = Number(increment[3]);
    profile.shuffleSeedMultiplier = Number(shuffleSeed[2]); profile.shuffleSeedModulus = Number(shuffleSeed[3]); profile.shuffleSeedOffset = Number(shuffleSeed[4]);
    shuffle = new RegExp(escape(shuffleSeed[1]) + '=\\(' + escape(shuffleSeed[1]) + '\\*(\\d+)\\+(\\d+)\\)%(\\d+);([\\w$]+)\\[' + index + '\\]=' + escape(shuffleSeed[1]) + '%\\(' + index + '\\+1\\)').exec(compact);
    if (!shuffle || compact.indexOf('for(' + saltRead[2] + '=1;') < 0 || !/([\w$]+)\[([\w$]+)\]=\1\[([\w$]+)\];\1\[\3\]=[\w$]+/.test(compact)) return null;
    profile.shuffleMultiplier = Number(shuffle[1]); profile.shuffleOffset = Number(shuffle[2]); profile.shuffleModulus = Number(shuffle[3]);
    operation = new RegExp('([\\w$]+)=' + escape(operationName) + '\\.charAt\\(' + index + '\\);if\\(\\1===[\'"]([^\'"])[\'"]\\)\\{([\\w$]+)=atob\\(\\3\\);?\\}elseif\\(\\1===[\'"]([^\'"])[\'"]\\)').exec(compact);
    if (!operation) return null;
    profile.base64Code = operation[2]; profile.reverseCode = operation[4];
    rotation = new RegExp('\\(26-\\(\\(' + escape(operation[1]) + '\\.charCodeAt\\(0\\)-(\\d+)\\)%26\\)\\)%26').exec(compact);
    if (!rotation) return null;
    profile.rotationBase = Number(rotation[1]);
    xor = new RegExp('([\\w$]+)=' + escape(seed[1]) + ',[\\w$]+=[\'"][\'"];[\\s\\S]*?\\1=\\(\\1(?:\\*(\\d+))?\\+' + escape(increment[1]) + '\\)%256;[\\w$]+\\+=String\\.fromCharCode\\(' + byte + '\\^\\1\\);\\1=\\(\\1\\+' + byte + '\\)%256').exec(compact);
    if (!xor) return null;
    profile.xorMultiplier = xor[2] ? Number(xor[2]) : 1;
    if (!profile.hashMultiplier || profile.hashMultiplier > 1000 || !profile.hashModulus || profile.hashModulus > 65537 || !profile.incrementModulus || !profile.shuffleSeedModulus || !profile.shuffleModulus || profile.shuffleModulus > 65537 || profile.shuffleMultiplier > 1000 || profile.shuffleOffset > 65537 || profile.hashShift > 8 || profile.xorMultiplier > 1000) return null;
    return profile;
}

function decodeSeeded(parts, profile) {
    var values = parts.slice();
    var salt = profile.salt;
    var operations = profile.operations;
    var count;
    var meta = profile.metadata;
    var h1 = 0;
    var h2 = 0;
    var i;
    var byte;
    var seed;
    var increment;
    var shuffleSeed;
    var result;
    var op;
    var swaps = [];
    var chars;
    var swap;
    var plain = '';
    var steps = [];
    if (profile.format === 'metadata') {
        count = values.length - meta.removed;
        if (meta.removed !== 2 || !meta.saltModulus || !meta.operationModulus || count < 1) throw new Error('Invalid metadata');
        i = meta.operationOffset + count % meta.operationModulus;
        if (i >= values.length) throw new Error('Invalid operation index');
        operations = values.splice(i, 1)[0];
        i = count % meta.saltModulus;
        if (i >= values.length) throw new Error('Invalid salt index');
        salt = values.splice(i, 1)[0];
    }
    if (typeof salt !== 'string' || !salt.length || salt.length > 4096 || typeof operations !== 'string' || !operations.length || operations.length > 16 || values.length > MAX_ITEMS) throw new Error('Seeded data limit');
    for (i = 0; i < values.length; i++) if (typeof values[i] !== 'string') throw new Error('Invalid part');
    for (i = 0; i < salt.length; i++) {
        byte = salt.charCodeAt(i);
        h1 = (h1 * profile.hashMultiplier + byte) % profile.hashModulus;
        h2 = profile.format === 'metadata' ? (h2 + ((byte << profile.hashShift) ^ i)) & 255 : (h2 ^ (byte + i)) & 255;
    }
    seed = (h1 * profile.seedMultiplier + h2) % 256;
    increment = ((profile.format === 'metadata' ? h2 : h1) % profile.incrementModulus) + profile.incrementOffset;
    shuffleSeed = (((profile.format === 'metadata' ? h2 : h1) * profile.shuffleSeedMultiplier + (profile.format === 'metadata' ? h1 : h2)) % profile.shuffleSeedModulus) + profile.shuffleSeedOffset;
    result = values.join('');
    if (result.length > MAX_INPUT) throw new Error('Seeded data limit');
    for (i = operations.length - 1; i >= 0; i--) {
        op = operations.charAt(i);
        if (op === profile.base64Code) { result = base64Decode(result); steps.push({ op: 'base64' }); }
        else if (op === profile.reverseCode) { result = result.split('').reverse().join(''); steps.push({ op: 'reverse' }); }
        else if (/^[a-zA-Z]$/.test(op)) { byte = (26 - ((op.charCodeAt(0) - profile.rotationBase) % 26)) % 26; result = rotate(result, byte); steps.push({ op: 'rot', shift: byte }); }
        else throw new Error('Invalid seeded operation');
    }
    for (i = result.length - 1; i >= 1; i--) { shuffleSeed = (shuffleSeed * profile.shuffleMultiplier + profile.shuffleOffset) % profile.shuffleModulus; swaps[i] = shuffleSeed % (i + 1); }
    chars = result.split('');
    for (i = 1; i < chars.length; i++) { swap = chars[i]; chars[i] = chars[swaps[i]]; chars[swaps[i]] = swap; }
    steps.push({ op: 'unshuffle' });
    result = chars.join('');
    for (i = 0; i < result.length; i++) {
        byte = result.charCodeAt(i);
        seed = (seed * profile.xorMultiplier + increment) % 256;
        plain += String.fromCharCode(byte ^ seed);
        seed = (seed + byte) % 256;
    }
    steps.push({ op: 'xor', multiplier: profile.xorMultiplier });
    return { value: plain, steps: steps };
}

/* Find literal source-property references, skipping comments and string values. */
function sourceVariables(html) {
    var found = {};
    var scripts = [];
    var re = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
    var match;
    var text;
    var i;
    var j;
    var s;
    var c;
    var item;
    var token;
    var previous;
    var history;
    var inClass;
    while ((match = re.exec(html)) && scripts.length < 128) scripts.push(match[1]);
    if (!scripts.length) scripts.push(html);
    for (s = 0; s < scripts.length; s++) {
        text = scripts[s]; history = [];
        for (i = 0; i < text.length;) {
            c = text.charAt(i);
            if (/\s/.test(c)) { i++; continue; }
            if (c === '/' && text.charAt(i + 1) === '/') { j = text.indexOf('\n', i + 2); i = j < 0 ? text.length : j + 1; continue; }
            if (c === '/' && text.charAt(i + 1) === '*') { j = text.indexOf('*/', i + 2); i = j < 0 ? text.length : j + 2; continue; }
            if (c === '"' || c === "'") {
                item = readString(text, i);
                if (!item) break;
                token = { type: 'string', value: item.value }; i = item.end;
            } else if (c === '`') {
                /* A template's contents are not literal player properties. */
                for (j = i + 1; j < text.length; j++) { if (text.charAt(j) === '\\') j++; else if (text.charAt(j) === '`') break; }
                token = { type: 'literal', value: '' }; i = j + 1;
            } else if (/[a-zA-Z_$]/.test(c)) {
                match = /^[a-zA-Z_$][\w$]*/.exec(text.slice(i));
                token = { type: 'identifier', value: match[0] }; i += match[0].length;
            } else {
                previous = history.length ? history[history.length - 1].value : '';
                if (c === '/' && (!previous || /^[=(,:!&|?;{\[]$/.test(previous) || /^(?:return|throw|case)$/.test(previous))) {
                    inClass = false;
                    for (j = i + 1; j < text.length; j++) {
                        if (text.charAt(j) === '\\') j++;
                        else if (text.charAt(j) === '[') inClass = true;
                        else if (text.charAt(j) === ']') inClass = false;
                        else if (text.charAt(j) === '/' && !inClass) break;
                        else if (text.charAt(j) === '\n') break;
                    }
                    token = { type: 'literal', value: '' }; i = j + 1;
                } else { token = { type: 'punctuation', value: c }; i++; }
            }
            if (token.type === 'identifier' && history.length === 3 && history[2].value === ':' && /^(?:file|src)$/.test(history[1].value) && /^(?:string|identifier)$/.test(history[1].type) && /^[{,]$/.test(history[0].value)) found[token.value] = true;
            history.push(token);
            if (history.length > 3) history.shift();
        }
    }
    return found;
}

function parseSeededDecoders(html, references) {
    var results = [];
    var functions = /(?:function\s+([\w$]+)\s*\(\s*([\w$]+)\s*\)|(?:var|let|const)\s+([\w$]+)\s*=\s*function\s*\(\s*([\w$]+)\s*\))\s*\{/g;
    var fn;
    var end;
    var profile;
    var calls;
    var call;
    var literal;
    var delimiter;
    var i;
    var parts;
    var decoded;
    var attempts = 0;
    var callAttempts;
    var referenced = references || sourceVariables(html);
    while ((fn = functions.exec(html)) && attempts++ < 64 && results.length < 32) {
        end = closingBrace(html, functions.lastIndex - 1);
        if (end < 0) continue;
        profile = seededProfile(html.slice(functions.lastIndex, end), fn[2] || fn[4]);
        functions.lastIndex = end + 1;
        if (!profile) continue;
        calls = new RegExp('(?:var|let|const)\\s+([\\w$]+)\\s*=\\s*' + (fn[1] || fn[3]).replace(/[$]/g, '\\$') + '\\s*\\(', 'g');
        callAttempts = 0;
        while ((call = calls.exec(html)) && callAttempts++ < 32) {
            /* Current pages also emit convincing unused decoder results. */
            if (!Object.prototype.hasOwnProperty.call(referenced, call[1])) continue;
            literal = readLiteral(html, calls.lastIndex, 0);
            if (!literal) continue;
            i = skipSpace(html, literal.end);
            parts = literal.value;
            if (typeof parts === 'string') {
                if (html.slice(i, i + 6) !== '.split') continue;
                i = skipSpace(html, i + 6);
                if (html.charAt(i++) !== '(') continue;
                delimiter = readLiteral(html, i, 0);
                if (!delimiter || typeof delimiter.value !== 'string' || !delimiter.value.length || delimiter.value.length > 8) continue;
                i = skipSpace(html, delimiter.end);
                if (html.charAt(i++) !== ')') continue;
                parts = parts.split(delimiter.value);
            }
            if (Object.prototype.toString.call(parts) !== '[object Array]' || html.charAt(skipSpace(html, i)) !== ')') continue;
            try {
                decoded = decodeSeeded(parts, profile);
                results.push({ value: decoded.value, steps: decoded.steps, format: profile.format, variable: call[1] });
            } catch (ignoredSeeded) {}
        }
    }
    return results;
}

function attributes(tag) {
    var result = {};
    var re = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    var m;
    while ((m = re.exec(tag))) result[m[1].toLowerCase()] = htmlEntities(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '');
    return result;
}

function subtitleLanguage(label) {
    var name = trim(label).toLowerCase();
    var known = { turkish: 'tr', 'türkçe': 'tr', turkce: 'tr', english: 'en', french: 'fr', 'français': 'fr', portuguese: 'pt', spanish: 'es', 'español': 'es', german: 'de', arabic: 'ar', russian: 'ru', italian: 'it' };
    return known[name] || (/^[a-z]{2,3}(?:-[a-z]{2})?$/i.test(name) ? name : 'und');
}

function extractPlayer(html, baseUrl) {
    var result = { streams: [], provisional: [], subtitles: [] };
    var seenStreams = {};
    var seenSubs = {};
    var seenProvisional = {};
    var scripts;
    var work;
    var i;
    var j;
    var re;
    var m;
    var attrs;
    var decoders;
    var seeded;
    var candidates;
    var literal;
    var arr;
    var obj;
    var ld;
    var references;
    if (typeof html !== 'string' || html.length > MAX_INPUT) return result;
    function addStream(value, quality, provisional, forceMedia) {
        var url = absoluteUrl(value, baseUrl);
        var stream;
        var seen = provisional ? seenProvisional : seenStreams;
        var target = provisional ? result.provisional : result.streams;
        if (!url || (!provisional && !forceMedia && !looksLikeMedia(url)) || seen[url] || target.length >= MAX_ITEMS) return;
        seen[url] = true;
        stream = { url: url };
        if (quality && /^(?:\d{3,4}p?|4k|8k|hd|sd|auto)$/i.test(String(quality))) stream.quality = String(quality);
        target.push(stream);
    }
    function addSubtitle(value, label, lang, isDefault) {
        var url = absoluteUrl(value, baseUrl);
        if (!url || seenSubs[url] || result.subtitles.length >= MAX_ITEMS) return;
        seenSubs[url] = true;
        result.subtitles.push({ id: 'hdfc-' + result.subtitles.length, url: url, label: label || '', lang: subtitleLanguage(lang || label), default: !!isDefault });
    }
    function readLd(value, depth) {
        var k;
        if (!value || typeof value !== 'object' || depth > 12) return;
        if (typeof value.contentUrl === 'string') addStream(value.contentUrl, null, true);
        if (Object.prototype.toString.call(value) === '[object Array]') for (k = 0; k < value.length && k < MAX_ITEMS; k++) readLd(value[k], depth + 1);
        else if (value['@graph']) readLd(value['@graph'], depth + 1);
    }
    re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
    while ((m = re.exec(html))) {
        attrs = attributes(m[1]);
        if (/^application\/ld\+json(?:;|$)/i.test(attrs.type || '')) {
            try { ld = JSON.parse(m[2]); readLd(ld, 0); } catch (ignoredLd) {}
        }
    }
    work = html.replace(/<script\b[^>]*type\s*=\s*(['"])application\/ld\+json\1[^>]*>[\s\S]*?<\/script\s*>/gi, '');
    scripts = [work].concat(unpackScripts(work));
    references = sourceVariables(work);
    for (i = 1; i < scripts.length; i++) { var unpackedReferences = sourceVariables(scripts[i]); Object.keys(unpackedReferences).forEach(function (name) { references[name] = true; }); }
    re = /<(source|video|track)\b([^>]*)>/gi;
    while ((m = re.exec(work))) {
        attrs = attributes(m[2]);
        if (m[1].toLowerCase() === 'track') {
            if (!attrs.kind || /^(?:captions|subtitles)$/i.test(attrs.kind)) addSubtitle(attrs.src, attrs.label, attrs.srclang, Object.prototype.hasOwnProperty.call(attrs, 'default'));
        } else addStream(attrs.src, attrs.label || attrs.res || attrs.size, false, /^(?:video\/|application\/(?:vnd\.apple\.mpegurl|x-mpegurl|dash\+xml))/i.test(attrs.type || ''));
    }
    for (i = 0; i < scripts.length; i++) {
        seeded = parseSeededDecoders(scripts[i], references);
        for (j = 0; j < seeded.length; j++) addStream(seeded[j].value);
        decoders = parseInlineDecoder(scripts[i]);
        for (j = 0; j < decoders.length; j++) {
            try { addStream(applyDecodeSteps(decoders[j].parts, decoders[j].steps)); } catch (ignoredDecode) {}
        }
        candidates = legacyCandidates(scripts[i]);
        for (j = 0; j < candidates.length; j++) addStream(candidates[j]);
        re = /(?:["']?(sources|tracks)["']?)\s*:\s*/g;
        while ((m = re.exec(scripts[i]))) {
            literal = readLiteral(scripts[i], re.lastIndex, 0);
            if (!literal || Object.prototype.toString.call(literal.value) !== '[object Array]') continue;
            arr = literal.value;
            for (j = 0; j < arr.length; j++) {
                obj = arr[j];
                if (!obj || typeof obj !== 'object') continue;
                if (m[1] === 'tracks') {
                    if (!obj.kind || /^(?:captions|subtitles)$/i.test(obj.kind)) addSubtitle(obj.file || obj.src, obj.label, obj.srclang || obj.language, obj.default);
                } else addStream(obj.file || obj.src, obj.label || obj.quality || obj.res, false, /^(?:hls|dash|video\/|application\/)/i.test(obj.type || ''));
            }
        }
        /* A stand-alone JW file property also appears outside sources arrays. */
        re = /(?:["']?(?:file|src)["']?)\s*:\s*(["'])/g;
        while ((m = re.exec(scripts[i]))) {
            literal = readString(scripts[i], re.lastIndex - 1);
            if (literal) addStream(literal.value);
        }
    }
    for (i = 0; i < result.streams.length; i++) if (result.subtitles.length) result.streams[i].subtitles = result.subtitles.slice();
    for (i = 0; i < result.provisional.length; i++) if (result.subtitles.length) result.provisional[i].subtitles = result.subtitles.slice();
    return result;
}

module.exports = {
    extractPlayer: extractPlayer,
    _internals: { absoluteUrl: absoluteUrl, parseInlineDecoder: parseInlineDecoder, applyDecodeSteps: applyDecodeSteps, unpackJS: unpackJS, unpackScripts: unpackScripts, base64Decode: base64Decode, readLiteral: readLiteral, legacyCandidates: legacyCandidates, seededProfile: seededProfile, decodeSeeded: decodeSeeded, parseSeededDecoders: parseSeededDecoders }
};
