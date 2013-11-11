define(function() {
    function insert(arr, rec, i) {
        i = i || 0;
        return arr.slice(0, i).concat(rec).concat(arr.slice(i));
    }

    function remove(arr, from, to) {
        from = Math.max(from, 0);
        to = Math.max(from, to || 0);
        return arr.slice(0, from).concat(arr.slice(to + 1));
    }

    return {
        insert: insert,
        remove: remove
    };
});