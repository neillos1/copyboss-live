// Legal Modal System (extracted from analyzer.html)
// Simple Legal Modal functions

function openLegalModal(modalId) {
    console.log('=== openLegalModal function called ===');
    console.log('Modal ID:', modalId);
    
    if (!modalId) {
        console.error('No modal ID provided');
        return;
    }
    
    // Create a simple modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'legal-modal-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: linear-gradient(135deg, #1e1e40, #2a2a50); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 0; max-width: 90%; width: 600px; max-height: 80vh; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); position: relative;';
    
    // Get content based on modal type
    let title, content;
    if (modalId === 'privacy-modal') {
        title = 'Privacy Policy';
        content = '<div style="padding: 32px;"><div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px;"><p style="margin: 0; color: #e2e8f0; font-size: 0.95rem; line-height: 1.5;">We respect your privacy and are committed to protecting your personal data.</p></div><div style="color: #cbd5e1; line-height: 1.6;"><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Information We Collect</h3><p>We collect information you provide directly to us, such as when you create an account, upload videos, or contact us for support.</p><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">How We Use Your Information</h3><p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Contact Us</h3><p>If you have any questions about this Privacy Policy, please contact us at hello@copy-boss.com.</p></div></div>';
    } else if (modalId === 'terms-modal') {
        title = 'Terms of Service';
        content = '<div style="padding: 32px;"><div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px;"><p style="margin: 0; color: #e2e8f0; font-size: 0.95rem; line-height: 1.5;">By using CopyBoss, you agree to these terms of service.</p></div><div style="color: #cbd5e1; line-height: 1.6;"><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Acceptance of Terms</h3><p>By accessing or using CopyBoss, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Use License</h3><p>We grant you a limited, non-exclusive, non-transferable license to use CopyBoss for your personal or business use.</p><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Contact Us</h3><p>If you have any questions about these Terms, please contact us at hello@copy-boss.com.</p></div></div>';
    } else if (modalId === 'support-modal') {
        title = 'Support';
        content = '<div style="padding: 32px;"><div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px;"><p style="margin: 0; color: #e2e8f0; font-size: 0.95rem; line-height: 1.5;">Need help? We are here to support you with any questions or issues.</p></div><div style="color: #cbd5e1; line-height: 1.6;"><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Contact Support</h3><p>For technical support, billing questions, or general inquiries, please contact us at hello@copy-boss.com.</p><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Response Time</h3><p>We typically respond to support requests within 24-48 hours during business days.</p><h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">Community Support</h3><p>Join our community hub for tips and support: <a href="/_prod/community/" style="color: #3b82f6;">copy-boss.com/community</a></p></div></div>';
    }
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05);';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = 'font-size: 1.5rem; font-weight: 600; color: white; margin: 0;';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = 'background: none; border: none; color: #8fa3c7; font-size: 1.5rem; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s ease; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 10001;';
    
    // Add click event with direct modal removal
    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('X button clicked - closing modal directly');
        const overlay = document.getElementById('legal-modal-overlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = '';
            console.log('Modal closed successfully via X button');
        } else {
            console.log('Modal overlay not found when X button clicked');
        }
    });
    
    header.appendChild(titleElement);
    header.appendChild(closeButton);
    
    // Assemble modal
    modalContent.innerHTML = '';
    modalContent.appendChild(header);
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = content;
    modalContent.appendChild(contentContainer);
    
    overlay.appendChild(modalContent);
    
    // Add to page
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Close on overlay click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            const overlay = document.getElementById('legal-modal-overlay');
            if (overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('legal-modal-overlay');
            if (overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    console.log('Modal created and displayed:', modalId);
}

function closeLegalModal() {
    const overlay = document.getElementById('legal-modal-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
        console.log('Modal closed successfully');
    }
}

// Export to global scope for inline onclick handlers
window.openLegalModal = openLegalModal;
window.closeLegalModal = closeLegalModal;
