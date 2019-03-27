all:
	./node_modules/webpack/bin/webpack.js
	cp index.html ${KLAB_WEBPROOF_DIR}
	cp out/bundle.js ${KLAB_WEBPROOF_DIR}
