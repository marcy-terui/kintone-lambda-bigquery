(function () {
    "use strict";
    var API_BASE_URL = 'https://example.execute-api.ap-northeast-1.amazonaws.com/test?';
    var API_KEY = '<your-api-key>'

    var now = new Date();
    var today = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0
    );
    function formatDate(date, format) {
      var formated = (!format) ? 'YYYY-MM-DD hh:mm:ss' : format;
      formated = formated.replace(/YYYY/g, date.getFullYear());
      formated = formated.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
      formated = formated.replace(/DD/g, ('0' + date.getDate()).slice(-2));
      formated = formated.replace(/hh/g, ('0' + date.getHours()).slice(-2));
      formated = formated.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
      formated = formated.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
      return formated;
    }
    var APIClient = {
      appId: null,

      putRecords: function() {
        var updateButton = document.getElementById('update_button')
        var app_id = this.appId;
        var records = [];
        var params = [];
        for (var i=0 ; i<24 ; i++) {
          var _from = new Date(
            today.getFullYear(), today.getMonth(), today.getDate(), (today.getHours() + i), 0, 0
          );
          var _to = new Date(
            today.getFullYear(), today.getMonth(), today.getDate(), (today.getHours() + i), 59, 59
          );
          var url = API_BASE_URL + 'from=' + formatDate(_from) + '&to=' + formatDate(_to);
          params.push({
            'url': url,
            'datetime': formatDate(_from, 'YYYY-MM-DDThh:mm:ss+09:00')
          });
        }
        params.forEach(function(param) {
          var url = param.url;
          var datetime = param.datetime;
          kintone.proxy(
            encodeURI(url),
            'GET',
            {'x-api-key': API_KEY},
            {},
            function(body, status, headers) {
              var data = JSON.parse(body);
              data['rows'].forEach(function(row) {
                records.push({
                  'datetime': {'value': datetime},
                  'req': {'value': row[0]},
                  'size': {'value': row[1]},
                  'time': {'value': row[2]}
                });
                updateButton.innerHTML = '更新中...(' + records.length + '/24)';
                if(records.length == 24) {
                  kintone.api(
                    kintone.api.url('/k/v1/records', true),
                    'POST',
                    {'app': app_id, 'records': records},
                    function(resp) {
                      location.reload(true);
                    },
                    function(resp) {
                      console.log(resp);
                    }
                  );
                }
              });
            },
            function(resp) {
              console.log(resp);
            }
          );
        });
      },

      deleteRecords: function(ids) {
        var params = {
          'app': this.appId,
          'ids': ids
        };
        kintone.api(
          kintone.api.url('/k/v1/records', true),
          'DELETE',
          params,
          function(resp) {
            location.reload(true);
          },
          function(resp) {
            console.log(resp);
          }
        );
      }
    }

    kintone.events.on('app.record.index.show', function (event) {
      var ids = [];
      event.records.forEach(function(record) {
        ids.push(record.$id.value);
      });
      APIClient.appId = event.appId
      if (document.getElementById('delete_button') == null) {
        var deleteButton = document.createElement('button');
        deleteButton.id = 'delete_button';
        deleteButton.innerHTML = '削除';
        deleteButton.onclick = function() {
          APIClient.deleteRecords(ids)
        }
        kintone.app.getHeaderMenuSpaceElement().appendChild(deleteButton);
      }
      if (document.getElementById('update_button') == null) {
        var updateButton = document.createElement('button');
        updateButton.id = 'update_button';
        updateButton.innerHTML = '更新';
        updateButton.onclick = function() {
          APIClient.putRecords()
        }
        kintone.app.getHeaderMenuSpaceElement().appendChild(updateButton);
      }
    });
})();
