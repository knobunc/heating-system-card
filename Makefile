NODE_VERSION = 22.15.0
NODE_DIR     = node-v$(NODE_VERSION)-linux-x64
NODE         = $(NODE_DIR)/bin/node
PORT         = 8080
PID_FILE     = .server.pid

.PHONY: check test serve stop clean

$(NODE):
	curl -fsSL https://nodejs.org/dist/v$(NODE_VERSION)/node-v$(NODE_VERSION)-linux-x64.tar.xz -o node.tar.xz
	tar xf node.tar.xz
	rm node.tar.xz

check: $(NODE)
	$(NODE) -c heating-system-card.js

test: check

serve:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Server already running (PID $$(cat $(PID_FILE)))"; \
	else \
		python3 -m http.server $(PORT) &>/dev/null & echo $$! > $(PID_FILE); \
		echo "Server running at http://localhost:$(PORT)/test.html (PID $$(cat $(PID_FILE)))"; \
	fi

stop:
	@if [ -f $(PID_FILE) ]; then \
		kill $$(cat $(PID_FILE)) 2>/dev/null && echo "Server stopped" || echo "Server not running"; \
		rm -f $(PID_FILE); \
	else \
		echo "No server running"; \
	fi

clean: stop
	rm -rf $(NODE_DIR)
