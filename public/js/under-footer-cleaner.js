(function(){
  // Clean up junk under footer
  function cleanUnderFooter() {
    var footers = document.getElementsByTagName('footer');
    if (!footers.length) return;
    
    var footer = footers[footers.length - 1];
    var removed = 0;
    
    // Remove everything after footer that contains junk text
    var junkPatterns = [
      /Registered To:/i,
      /Zerra Group/i,
      /ICO No:/i,
      /ZB\d{5,}/i,
      /Privacy Policy Close/i,
      /Cookie Policy Close/i,
      /Payment Security/i,
      /Compliance/i,
      /Social Proof/i,
      /GDPR/i
    ];
    
    var node = footer.nextSibling;
    while (node) {
      var next = node.nextSibling;
      var shouldRemove = false;
      
      if (node.nodeType === 1) { // Element
        var el = node;
        var text = el.textContent || '';
        var className = el.className || '';
        var id = el.id || '';
        
        // Check if it's a modal or overlay
        if (el.matches && el.matches('.modal, .modal-overlay, [id*="modal"], [class*="modal"]')) {
          shouldRemove = true;
        }
        
        // Check for junk text patterns
        for (var i = 0; i < junkPatterns.length; i++) {
          if (junkPatterns[i].test(text) || junkPatterns[i].test(className) || junkPatterns[i].test(id)) {
            shouldRemove = true;
            break;
          }
        }
        
        // Check for trust/GDPR related classes/IDs
        if (/(cb-trust|trust-footer|payment-security|compliance|social-proof|gdpr|cookie-banner|ribbon)/i.test(className + ' ' + id)) {
          shouldRemove = true;
        }
        
        // Remove script tags that are reinjectors
        if (el.tagName === 'SCRIPT') {
          var src = (el.getAttribute('src') || '').toLowerCase();
          if (/trust|payment|compliance|gdpr|cookie/.test(src)) {
            shouldRemove = true;
          }
        }
        
        if (shouldRemove) {
          el.remove();
          removed++;
        }
      } else if (node.nodeType === 3) { // Text node
        var text = node.textContent || '';
        for (var i = 0; i < junkPatterns.length; i++) {
          if (junkPatterns[i].test(text)) {
            node.remove();
            removed++;
            break;
          }
        }
      }
      
      node = next;
    }
    
    return removed;
  }
  
  // Run immediately and on DOM ready
  var removed = cleanUnderFooter();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      cleanUnderFooter();
    });
  }
  
  // Also run after a delay to catch late injections
  setTimeout(cleanUnderFooter, 100);
  setTimeout(cleanUnderFooter, 500);
  setTimeout(cleanUnderFooter, 1000);
  
  // Set debug info
  window.__underFooterCleaned = removed;
})();
