lddtree $1  | grep "^    l" | cut -d ">" -f 2 | while read n; do dpkg-query -S $n; done | sed 's/^\([^:]\+\):.*$/\1/' | sort | uniq
