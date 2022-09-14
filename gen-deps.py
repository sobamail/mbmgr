#!/usr/bin/env python3

import json,sys
data = json.load(open(sys.argv[1], 'rb'))
targets = data["targets"]
files = set()
deps = sys.argv[2:]
past = set()

while len(deps) > 0:
    dep = deps.pop()
    if dep in past:
        continue
    past.add(dep)

    dep_data = targets[dep]
    if dep_data["type"] == "executable":
        print("# skipping dep", dep, "type", dep_data["type"])
        continue
    print("# processing dep", dep, "type", dep_data["type"])

    for in_file, out_files in dep_data.get("source_outputs",{}).items():
        files.update(out_files)
        for fn in out_files:
            pass  # print("#   dep", dep, "files", fn)

    deps.extend(dep_data["deps"])

files = sorted(list(files))
print("set(V8_OBJS )")
print("list(APPEND V8_OBJS")
for fn in files:
    print('"${V8_BINARY_DIR}/', fn, '"', sep='')
print(")")
