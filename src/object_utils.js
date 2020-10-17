/**
 * Merge two objects.  By default, obj2 overrides any members existing in obj1.
 * @param {*} obj1
 * @param {*} obj2
 * @param {*} deep Whether to merge nested sub-documents.  Default true.
 */
const objectMerge = (obj1, obj2, deep = true) => {
  // create a clone of obj1 so we don't modify the original
  obj1 = JSON.parse(JSON.stringify(obj1))
  for (let key of Object.keys(obj2)) {
    // merge sub-objects, if any
    if (deep && typeof obj2[key] === 'object' && obj2[key] !== null) {
      // this member is an object in both obj1 and obj2... merge it
      obj1[key] = objectMerge(obj1[key], obj2[key])
    } else {
      // this member is not an object.. simply add/overwrite it from obj2 to obj1
      obj1[key] = obj2[key] // add all members from obj2 to obj1
    }
  }

  // return the object with all members added
  return obj1
}

const objectKeysToLowercase = (obj1, deep = true) => {
  let obj2 = {} // our new lowercase object
  for (let key of Object.keys(obj1)) {
    // handle any nested sub-documents
    if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      // this member is an object in both obj1 and obj2... merge it
      obj1[key] = objectKeysToLowercase(obj1[key], deep)
    }
    // add a new member with lowercase key to the new object
    obj2[key.toLowerCase()] = obj1[key]
  }
  return obj2
}

module.exports = { objectMerge, objectKeysToLowercase }
