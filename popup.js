let passwordField = document.getElementById('password')
let changePassword = document.getElementById('changePassword');

changePassword.onclick = function(element) {
  let password = passwordField.value;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {password: password}, function(response) {
      console.log(response);
    });
  });
};
