// All test data is loaded from the server at startup.
// Falls back to embedded data if fetch fails.

window.TESTS_DATA = null; // populated by loadTests()

window.loadTests = async function() {
  const ids = ['pc90-novice-2026', 'pc100-intermediate-2026', 'pc110-open-2026'];
  const files = ['pc90-novice', 'pc100-intermediate', 'pc110-open'];

  try {
    const results = await Promise.all(
      files.map(f => fetch(`/data/tests/${f}.json`).then(r => r.json()))
    );
    window.TESTS_DATA = results;
  } catch (e) {
    console.warn('Failed to load test data from server, using empty list:', e);
    window.TESTS_DATA = [];
  }
};
