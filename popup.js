let passwordField = document.getElementById('password')
let changePassword = document.getElementById('changePassword');
let message = document.getElementById('message');

changePassword.onclick = function(element) {
  let password = passwordField.value;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {password: password}, function(response) {
      if (!response) {
        message.className = 'error';
        message.innerHTML = 'Dynalist does not respond. Please reload the page and try again.';
      } else if (response.success) {
        message.className = 'success';
        message.innerHTML = 'Successfully set a new password.';
      } else {
        message.className = 'error';
        message.innerHTML = 'Creating a new key from your password failed. Please send log data to developer.';
      }
    });
  });
};
