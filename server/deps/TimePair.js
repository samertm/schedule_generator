function TimePair (start, end) {
    function toString() {
        return "("+this.start+", "+this.end+")";
    }
    function length() {
        return this.end - this.start;
    }
    return { start: start, end: end, toString: toString};
}
