"use strict";
const Web3Modal = window.Web3Modal.default;
let web3Modal;
let provider;
let selectedAccount;
let url_string = window.location.href;
let url = new URL(url_string);

function init() {
  const providerOptions = {};
  web3Modal = new Web3Modal({
    cacheProvider: false,
    providerOptions,
    disableInjectedProvider: false,
  });
}
async function fetchAccountData() {
  const web3 = new Web3(provider);
  const accounts = await web3.eth.getAccounts();
  selectedAccount = accounts[0];
}

async function onConnect() {
  try {
    provider = await web3Modal.connect();
  } catch (e) {
    console.log("Could not get a wallet connection", e);
    return;
  }

  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });

  fetchAccountData();
}

async function connect() {
  if (window.web3 == undefined && window.ethereum == undefined) {
    alert("metamask not detected");
  }
  if (url.searchParams.get("token") == undefined) {
    alert("no token detected");
    return;
  }
  provider = await web3Modal.connect();
  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });

  await fetchAccountData();

  if (!selectedAccount) {
    document.getElementById("connect-button").innerHTML = "Not connected";
    iziToast.error({
      title: "Error",
      message: "You need to connect a ccount.",
    });
  }

  if (selectedAccount) {
    const web3 = new Web3(provider);
    document.getElementById("connect-button").innerHTML = "Connected";
    document.getElementById("connect-button").classList.add("btn-outline-dark");
    document.getElementById("connect-button").classList.remove("btn-outline-success");

    web3.eth.personal.sign(selectedAccount + "dksakdlasmcasmclmascwqicmwpq", selectedAccount).then((signature) => {
      axios
        .post("/updateWallet", {
          wallet: selectedAccount,
          signature: signature,
          token: url.searchParams.get("token").replace("?token=", ""),
        })
        .then((res) => {
          if (res.data.error) {
            iziToast.error({
              title: "Error",
              message: res.data.message,
            });
          } else {
            iziToast.success({
              title: "OK",
              message: "Successfully connected",
            });
          }
        });
    });
  } else {
    document.getElementById("connect-button").innerHTML = "Connect";
    document.getElementById("connect-button").classList.add("btn-outline-sucess");
    document.getElementById("connect-button").classList.remove("btn-outline-dark");
  }
}

window.addEventListener("load", async () => {
  init();
});
